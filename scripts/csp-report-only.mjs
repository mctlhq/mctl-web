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

const SCRIPT_RE =
  /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script\s*>/gi

function attr(attrs, name) {
  const m = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i',
  ).exec(attrs)
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null
}

export function hashOf(body) {
  return `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`
}

/** Inline executable scripts of one HTML document: [{ hash, type, body }]. */
export function inlineExecutableScripts(html, where = '<html>') {
  const found = []
  let matched = 0
  for (const m of html.matchAll(SCRIPT_RE)) {
    matched++
    const attrs = m[1]
    const body = m[2]
    if (/(?:^|\s)src\s*=/i.test(attrs)) continue // external: covered by 'self'/hosts
    const type = (attr(attrs, 'type') ?? '').trim().toLowerCase()
    if (UNSUPPORTED_TYPES.has(type)) {
      throw new Error(`${where}: <script type="${type}"> needs its own CSP keyword; not supported`)
    }
    if (type !== '' && !JS_TYPES.has(type)) continue // inert data block
    found.push({ hash: hashOf(body), type: type || 'classic', body })
  }
  // A "<script" the pattern did not close is a document we could not read in
  // full. That is a failure to observe, never "no inline scripts".
  const opened = (html.match(/<script\b/gi) ?? []).length
  if (opened !== matched) {
    throw new Error(`${where}: ${opened} <script> tags opened but ${matched} parsed; refusing to guess`)
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
  for (const f of files) {
    const rel = relative(publicDir, f)
    for (const s of inlineExecutableScripts(readFileSync(f, 'utf8'), rel)) {
      if (!byHash.has(s.hash)) byHash.set(s.hash, { type: s.type, files: [] })
      byHash.get(s.hash).files.push(rel)
    }
  }
  return { files, byHash }
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
  const { files, byHash } = collectHashes(publicDir)
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
    const { files, byHash } = collectHashes(publicDir)
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
