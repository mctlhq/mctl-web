import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildReportOnly, enforcingPolicy, hashOf, inlineExecutableScripts,
  collectHashes, renderConf, verify, inlineHandlers,
} from './csp-report-only.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ENFORCING = enforcingPolicy(readFileSync(join(here, '../nginx/security-headers.conf'), 'utf8'))

const PAGE = `<!DOCTYPE html><html><head>
<script type="importmap">{"imports":{"#entry":"/_nuxt/a.js"}}</script>
<script type="application/ld+json">{"@type":"Organization"}</script>
<script type="application/json" id="__NUXT_DATA__">[1,2]</script>
<script src="https://stats.mctl.ai/insights.js" defer data-x="a>b"></script>
<script type="module" src="/_nuxt/a.js"></script>
</head><body><script>window.__NUXT__={};window.__NUXT__.config={a:"</b>"}</script></body></html>`

function site(pages) {
  const dir = mkdtempSync(join(tmpdir(), 'csp-'))
  for (const [p, html] of Object.entries(pages)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true })
    writeFileSync(join(dir, p), html)
  }
  return dir
}

function conf(dir) {
  const { byHash } = collectHashes(dir)
  return renderConf(buildReportOnly(ENFORCING, byHash.keys()), byHash.size)
}

test('only executable inline scripts are hashed; data blocks and external scripts are not', () => {
  const s = inlineExecutableScripts(PAGE)
  assert.deepEqual(s.map((x) => x.type).sort(), ['classic', 'importmap'])
  assert.equal(s.find((x) => x.type === 'classic').hash, hashOf('window.__NUXT__={};window.__NUXT__.config={a:"</b>"}'))
})

test('policy: hashes in, unsafe-inline out of script-src; hardening added; enforcing hosts kept', () => {
  const dir = site({ 'index.html': PAGE })
  const policy = buildReportOnly(ENFORCING, collectHashes(dir).byHash.keys())
  const script = policy.split(';').find((d) => d.trim().startsWith('script-src'))
  assert.ok(!script.includes("'unsafe-inline'"))
  assert.match(script, /'sha256-/)
  assert.match(script, /https:\/\/stats\.mctl\.ai/)
  assert.match(policy, /style-src-elem 'self' 'unsafe-inline'/)
  assert.match(policy, /style-src-attr 'none'/)
  for (const d of ["object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'"]) {
    assert.ok(policy.includes(d), d)
  }
})

test('verify passes on a converged site', () => {
  const dir = site({ 'index.html': PAGE, 'privacy/index.html': PAGE })
  assert.deepEqual(verify(dir, conf(dir)).problems, [])
})

// Mutation: these are the "red" halves of the detector.
test('verify FAILS when a hash is dropped from the header', () => {
  const dir = site({ 'index.html': PAGE })
  const bootstrap = hashOf('window.__NUXT__={};window.__NUXT__.config={a:"</b>"}')
  const mutated = conf(dir).replace(bootstrap, '')
  const r = verify(dir, mutated)
  assert.equal(r.problems.length, 1)
  assert.match(r.problems[0], /classic script/)
})

test('verify FAILS when an inline script changes after the header was generated', () => {
  const dir = site({ 'index.html': PAGE })
  const c = conf(dir)
  writeFileSync(join(dir, 'index.html'), PAGE.replace('__NUXT__={};', '__NUXT__={x:1};'))
  assert.ok(verify(dir, c).problems.some((p) => /classic script/.test(p)))
})

test('verify FAILS when a new page adds a new inline script', () => {
  const dir = site({ 'index.html': PAGE })
  const c = conf(dir)
  writeFileSync(join(dir, 'new.html'), '<html><script>alert(1)</script></html>')
  assert.ok(verify(dir, c).problems.some((p) => /new\.html/.test(p)))
})

test("verify FAILS when 'unsafe-inline' creeps back into script-src", () => {
  const dir = site({ 'index.html': PAGE })
  const c = conf(dir).replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
  assert.ok(verify(dir, c).problems.some((p) => /unsafe-inline/.test(p)))
})

test('verify FAILS when a hardening directive is missing', () => {
  const dir = site({ 'index.html': PAGE })
  const c = conf(dir).replace("frame-ancestors 'self';", '')
  assert.ok(verify(dir, c).problems.some((p) => /frame-ancestors/.test(p)))
})

// "Could not observe" is not "absent".
test('unreadable input is an error, never an empty hash set', () => {
  assert.throws(() => collectHashes(site({ 'data.txt': 'x' })), /no \.html files/)
  assert.throws(() => inlineExecutableScripts('<html><script>alert(1)'), /refusing to guess/)
  assert.throws(() => inlineExecutableScripts('<script type="speculationrules">{}</script>'), /speculationrules/)
  const dir = site({ 'index.html': PAGE })
  assert.throws(() => verify(dir, '# empty include\n'), /exactly one/)
})

test('a script tag with ">" inside a quoted attribute is still parsed', () => {
  const s = inlineExecutableScripts('<script data-x="a>b">var a=1</script>')
  assert.equal(s[0].hash, hashOf('var a=1'))
})

test('spec-tolerant end tags close the script ("</script\t\n bar>", "</SCRIPT/>")', () => {
  for (const end of ['</script\t\n bar>', '</SCRIPT/>', '</script >']) {
    const s = inlineExecutableScripts(`<script>var a=1</b>${end}<script>var b=2</script>`)
    assert.deepEqual(s.map((x) => x.hash), [hashOf('var a=1</b>'), hashOf('var b=2')], end)
  }
})

test('an unclosed <script still fails, including with a tolerant-looking prefix', () => {
  assert.throws(() => inlineExecutableScripts('<script>a()</scriptx>'), /unclosed/)
  assert.throws(() => inlineExecutableScripts('<p>x</p><script>alert(1)'), /unclosed/)
  assert.throws(() => inlineExecutableScripts('<script src="a.js"'), /unterminated/)
})

test('attribute names are not matched inside quoted values (src)', () => {
  const s = inlineExecutableScripts('<script data-x="a src=b">inline()</script>')
  assert.equal(s.length, 1)
  assert.equal(s[0].hash, hashOf('inline()'))
  assert.equal(inlineExecutableScripts("<script data-x='a' SRC = '/x.js'></script>").length, 0)
})

test('attribute names are not matched inside quoted values (type)', () => {
  const s = inlineExecutableScripts('<script data-x="b type=application/json">inline()</script>')
  assert.equal(s.length, 1)
  assert.equal(s[0].type, 'classic')
})

test('inlineHandlers finds on* handlers and javascript: URLs inside tags', () => {
  const h = inlineHandlers('<a href=" JaVa\tScript:alert(1)" onClick="x()">a</a><body onload=f()>', 'p.html')
  assert.equal(h.length, 3)
  assert.ok(h.some((m) => /onclick/.test(m)) && h.some((m) => /onload/.test(m)) && h.some((m) => /javascript: URL in href/.test(m)))
})

test('inlineHandlers has no false positives in text, scripts, styles, comments, JSON or values', () => {
  const html = `<p>use onclick= and javascript:void(0) here, a < b</p>
<script>el.setAttribute("onclick","x()");var u="javascript:1"; if(a<b){}</script>
<script type="application/ld+json">{"onload=":"javascript:x"}</script>
<style>a[onclick=x]{color:red}</style><!-- <a onclick="x()"> -->
<a href="/x" data-note="onclick=1 javascript:2" title="onerror=3">ok</a><a href="https://x/?u=javascript:1">ok</a>`
  assert.deepEqual(inlineHandlers(html), [])
})

test('verify FAILS on an inline handler or javascript: URL in built HTML', () => {
  const dir = site({ 'index.html': PAGE })
  const c = conf(dir)
  writeFileSync(join(dir, 'bad.html'), '<html><button onclick="x()">b</button><a href="javascript:x()">a</a></html>')
  const r = verify(dir, c)
  assert.ok(r.problems.some((p) => /bad\.html.*onclick/.test(p)))
  assert.ok(r.problems.some((p) => /bad\.html.*javascript: URL/.test(p)))
})
