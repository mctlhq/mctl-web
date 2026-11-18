#!/usr/bin/env node
// Builds and verifies the Content-Security-Policy-Report-Only header.
//
//   node scripts/csp-report-only.mjs generate <publicDir> <enforcingConf> <outConf>
//   node scripts/csp-report-only.mjs verify   <publicDir> <outConf>
//
// `generate` scans every built HTML file for inline EXECUTABLE scripts, hashes
// them, and writes an nginx include holding one Report-Only header: the
// enforcing policy with 'unsafe-inline' removed from script-src, the hashes
// added, and the extra hardening directives. `verify` re-reads the written
// header (not the generator's in-memory state) and the built HTML and fails if
// any inline executable script is not covered.
//
// Hashes cannot be hardcoded: the bootstrap script embeds build-specific
// values, so they are derived from the output of every build.

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// A script element's type decides whether the browser executes its body.
// Absent/empty, "module" and any JavaScript MIME type execute; "importmap" is
// not executed but is governed by script-src and needs a hash too. Anything
// else (application/json, application/ld+json, ...) is inert data.
const JS_TYPES = new Set([
  'module', 'importmap', 'text/javascript', 'application/javascript',
  'text/ecmascript', 'application/ecmascript', 'text/jscript',
  'application/x-javascript', 'text/livescript', 'text/x-javascript',
])
// Governed by their own CSP keyword, not by script-src hashes. If one ever
// appears we cannot claim coverage, so the build stops instead of guessing.
const UNSUPPORTED_TYPES = new Set(['speculationrules'])

// Start/end tags follow the HTML tokenizer: "<script" and "</script" end at
// whitespace, "/" or ">", and an end tag may carry junk attributes
// ("</script\t\n bar>" still closes the element).
const SCRIPT_OPEN_RE = /^<script(?=[\s/>])/i
const STYLE_OPEN_RE = /^<style(?=[\s/>])/i
const SCRIPT_CLOSE_RE = /<\/script(?=[\s/>])[^>]*>/gi
const STYLE_CLOSE_RE = /<\/style(?=[\s/>])[^>]*>/gi
const TAG_OPEN_RE = /^<([a-zA-Z][^\s/>]*)/
// The rest of a start tag, up to the ">" that is not inside a quoted value.
const TAG_REST_RE = /(?:[^>"']|"[^"]*"|'[^']*')*>/y
const ATTR_RE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g

/** Attribute map (lowercased name -> value). Quoted values are consumed whole,
 *  so text inside a value can never be mistaken for an attribute name. The
 *  first occurrence of a name wins, as in the HTML parser. */
function parseAttrs(str) {
  const out = new Map()
  for (const m of str.matchAll(ATTR_RE)) {
    const name = m[1].toLowerCase()
    if (!out.has(name)) out.set(name, m[2] ?? m[3] ?? m[4] ?? '')
  }
  return out
}

/** Walks a document once, by position. Comments and <script>/<style> bodies
 *  are skipped, never stripped, so nothing can be hidden or faked by nesting
 *  ("<sty<style>le>"). Returns every start tag seen outside those bodies and
 *  every <script> element with its body. Anything unreadable throws: a
 *  failure to observe is never "no tags". */
function scanDocument(html, where) {
  const tags = []
  const scripts = []
  let pos = 0
  for (;;) {
    const i = html.indexOf('<', pos)
    if (i === -1) break
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4)
      if (end === -1) throw new Error(`${where}: unclosed comment; refusing to guess`)
      pos = end + 3
      continue
    }
    const name = TAG_OPEN_RE.exec(html.slice(i, i + 64))
    if (!name) { pos = i + 1; continue }
    TAG_REST_RE.lastIndex = i + name[0].length
    const rest = TAG_REST_RE.exec(html)
    if (!rest) throw new Error(`${where}: unterminated <${name[1]}> start tag; refusing to guess`)
    const attrs = parseAttrs(rest[0].slice(0, -1))
    tags.push({ name: name[1].toLowerCase(), attrs })
    pos = TAG_REST_RE.lastIndex
    const isScript = SCRIPT_OPEN_RE.test(html.slice(i, i + 16))
    if (!isScript && !STYLE_OPEN_RE.test(html.slice(i, i + 15))) continue
    const closeRe = isScript ? SCRIPT_CLOSE_RE : STYLE_CLOSE_RE
    closeRe.lastIndex = pos
    const close = closeRe.exec(html)
    if (!close) throw new Error(`${where}: unclosed <${isScript ? 'script' : 'style'}> (no end tag); refusing to guess`)
    if (isScript) scripts.push({ attrs, body: html.slice(pos, close.index) })
    pos = close.index + close[0].length
  }
  return { tags, scripts }
}

export function hashOf(body) {
  return `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`
}

/** Inline executable scripts of one HTML document: [{ hash, type, body }]. */
export function inlineExecutableScripts(html, where = '<html>') {
  const found = []
  for (const { attrs, body } of scanDocument(html, where).scripts) {
    if (attrs.has('src')) continue // external: covered by 'self'/hosts
    const type = (attrs.get('type') ?? '').trim().toLowerCase()
    if (UNSUPPORTED_TYPES.has(type)) {
      throw new Error(`${where}: <script type="${type}"> needs its own CSP keyword; not supported`)
    }
    if (type !== '' && !JS_TYPES.has(type)) continue // inert data block
    found.push({ hash: hashOf(body), type: type || 'classic', body })
  }
  return found
}

// script-src without 'unsafe-inline' also blocks these, and hashes cannot cover
// them: an inline event handler or a javascript: URL would silently break.
const URL_ATTRS = new Set([
  'href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'poster',
  'background', 'cite', 'longdesc', 'manifest', 'ping',
])

/** Inline event handlers and javascript: URLs, looked for inside tags only
 *  (script/style bodies, comments and text are never inspected). */
export function inlineHandlers(html, where = '<html>') {
  const found = []
  for (const { name: tag, attrs } of scanDocument(html, where).tags) {
    for (const [name, value] of attrs) {
      if (/^on[a-z]+$/.test(name)) {
        found.push(`${where}: <${tag}> has inline event handler ${name}=`)
      } else if (URL_ATTRS.has(name) && /^javascript:/i.test(value.replace(/[\u0000-\u0020]/g, ''))) {
        found.push(`${where}: <${tag}> has a javascript: URL in ${name}=`)
      }
    }
  }
  return found
}

export function htmlFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p))
    else if (name.endsWith('.html')) out.push(p)
  }
  return out.sort()
}

/** Every distinct hash across the site, with the files that use each. */
export function collectHashes(publicDir) {
  const files = htmlFiles(publicDir)
  if (files.length === 0) {
    throw new Error(`no .html files under ${publicDir}; is the build output there?`)
  }
  const byHash = new Map()
  const handlers = []
  for (const f of files) {
    const rel = relative(publicDir, f)
    const html = readFileSync(f, 'utf8')
    handlers.push(...inlineHandlers(html, rel))
    for (const s of inlineExecutableScripts(html, rel)) {
      if (!byHash.has(s.hash)) byHash.set(s.hash, { type: s.type, files: [] })
      byHash.get(s.hash).files.push(rel)
    }
  }
  return { files, byHash, handlers }
}

const HEADER_RE = /add_header\s+Content-Security-Policy\s+"([^"]*)"\s+always;/g

export function enforcingPolicy(confText) {
  const all = [...confText.matchAll(HEADER_RE)]
  if (all.length !== 1) {
    throw new Error(`expected exactly one enforcing Content-Security-Policy, found ${all.length}`)
  }
  return all[0][1]
}

export function buildReportOnly(enforcing, hashes) {
  const out = []
  let sawScript = false
  let sawStyle = false
  for (const raw of enforcing.split(';')) {
    const d = raw.trim()
    if (!d) continue
    const [name, ...vals] = d.split(/\s+/)
    if (name === 'script-src') {
      sawScript = true
      const rest = vals.filter((v) => v !== "'unsafe-inline'")
      if (!rest.includes("'self'")) throw new Error("enforcing script-src lacks 'self'")
      const hosts = rest.filter((v) => v !== "'self'")
      out.push(['script-src', "'self'", ...[...hashes].sort(), ...hosts].join(' '))
    } else if (name === 'style-src') {
      sawStyle = true
      // Inline <style> elements stay allowed; inline style="" attributes are
      // what the report is meant to surface.
      out.push(['style-src-elem', ...vals].join(' '))
      out.push("style-src-attr 'none'")
    } else if (['object-src', 'base-uri', 'form-action', 'frame-ancestors'].includes(name)) {
      throw new Error(`enforcing policy already sets ${name}; extend the generator deliberately`)
    } else {
      out.push(d)
    }
  }
  if (!sawScript || !sawStyle) throw new Error('enforcing policy lacks script-src or style-src')
  // frame-ancestors 'self' mirrors X-Frame-Options SAMEORIGIN (no new
  // restriction). base-uri/form-action/object-src: no <base>, <object> or
  // native form submission exists in the built site.
  out.push("object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'")
  return out.join('; ') + ';'
}

export function renderConf(policy, hashCount) {
  return (
    '# GENERATED by scripts/csp-report-only.mjs at image build time. Do not edit.\n' +
    `# ${hashCount} inline script hash(es). Report-Only: violations are logged in the\n` +
    '# browser console and never block anything.\n' +
    `add_header Content-Security-Policy-Report-Only "${policy}" always;\n`
  )
}

const RO_RE = /add_header\s+Content-Security-Policy-Report-Only\s+"([^"]*)"\s+always;/g

export function readReportOnly(confText) {
  const all = [...confText.matchAll(RO_RE)]
  if (all.length !== 1) {
    throw new Error(`expected exactly one Content-Security-Policy-Report-Only header, found ${all.length}`)
  }
  return all[0][1]
}

/** Returns a list of problems; empty means every inline script is covered. */
export function verify(publicDir, confText) {
  const policy = readReportOnly(confText)
  const dirs = new Map(
    policy.split(';').map((d) => d.trim()).filter(Boolean)
      .map((d) => { const [n, ...v] = d.split(/\s+/); return [n, v] }),
  )
  const problems = []
  const script = dirs.get('script-src')
  if (!script) problems.push('no script-src in the Report-Only header')
  else if (script.includes("'unsafe-inline'")) problems.push("script-src still has 'unsafe-inline'")
  for (const need of ['object-src', 'base-uri', 'form-action', 'frame-ancestors']) {
    if (!dirs.has(need)) problems.push(`missing ${need}`)
  }
  const { files, byHash, handlers } = collectHashes(publicDir)
  problems.push(...handlers)
  for (const [hash, info] of byHash) {
    if (!script || !script.includes(hash)) {
      problems.push(`inline ${info.type} script ${hash} (${info.files.join(', ')}) is not in script-src`)
    }
  }
  return { problems, files: files.length, hashes: byHash.size }
}

function main(argv) {
  const [cmd, ...a] = argv
  if (cmd === 'generate' && a.length === 3) {
    const [publicDir, enforcingConf, outConf] = a
    const { files, byHash, handlers } = collectHashes(publicDir)
    if (handlers.length) {
      throw new Error(`inline handlers/javascript: URLs are blocked without 'unsafe-inline':\n  ${handlers.join('\n  ')}`)
    }
    if (byHash.size === 0) {
      // The bootstrap script is always present today. Zero means the scan
      // failed to see it, which must not silently ship a policy with no hashes.
      throw new Error('found no inline executable scripts; expected at least the Nuxt bootstrap')
    }
    const policy = buildReportOnly(enforcingPolicy(readFileSync(enforcingConf, 'utf8')), byHash.keys())
    writeFileSync(outConf, renderConf(policy, byHash.size))
    console.log(`csp-report-only: ${files.length} html file(s), ${byHash.size} distinct inline script hash(es) -> ${outConf}`)
    for (const [h, i] of byHash) console.log(`  ${h} ${i.type} x${i.files.length}`)
  } else if (cmd === 'verify' && a.length === 2) {
    const r = verify(a[0], readFileSync(a[1], 'utf8'))
    if (r.problems.length) {
      for (const p of r.problems) console.error(`csp-report-only: FAIL ${p}`)
      process.exit(1)
    }
    console.log(`csp-report-only: OK ${r.files} html file(s), ${r.hashes} hash(es) all covered`)
  } else {
    console.error('usage: csp-report-only.mjs generate <publicDir> <enforcingConf> <outConf> | verify <publicDir> <outConf>')
    process.exit(2)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)) } catch (e) { console.error(`csp-report-only: ERROR ${e.message}`); process.exit(1) }
}
