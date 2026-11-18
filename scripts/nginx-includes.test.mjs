// nginx's add_header is inherited only into a block that declares none of its
// own. Every block that sets any header must therefore include the shared
// security headers and the generated Report-Only header itself.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const SEC = 'include /etc/nginx/snippets/security-headers.conf;'
const RO = 'include /etc/nginx/snippets/csp-report-only.conf;'

/** Splits a server block into [{ head, body }] for each top-level location. */
export function locations(text) {
  const out = []
  const re = /^\s{4}(location\s[^{]*)\{/gm
  for (const m of text.matchAll(re)) {
    let depth = 1
    let i = m.index + m[0].length
    for (; i < text.length && depth > 0; i++) {
      if (text[i] === '{') depth++
      else if (text[i] === '}') depth--
    }
    if (depth !== 0) throw new Error(`unbalanced braces in ${m[1]}`)
    out.push({ head: m[1].trim(), body: text.slice(m.index + m[0].length, i - 1) })
  }
  return out
}

export function problems(text) {
  const bad = []
  const locs = locations(text)
  if (locs.length === 0) bad.push('parsed no locations')
  const header = /^\s*add_header\s/m
  // Health checks deliberately carry no security headers (plain-text probes).
  const exempt = new Set(['location = /healthz', 'location = /readyz'])
  for (const l of locs) {
    if (!header.test(l.body) || exempt.has(l.head)) continue
    if (!l.body.includes(SEC)) bad.push(`${l.head}: missing ${SEC}`)
    if (!l.body.includes(RO)) bad.push(`${l.head}: missing ${RO}`)
    if (/add_header\s+Content-Security-Policy/i.test(l.body)) bad.push(`${l.head}: inline CSP header, use the snippet`)
  }
  const serverLevel = text.replace(/^\s{4}location\s[^{]*\{[\s\S]*?^\s{4}\}/gm, '')
  if (!serverLevel.includes(SEC)) bad.push(`server level: missing ${SEC}`)
  if (!serverLevel.includes(RO)) bad.push(`server level: missing ${RO}`)
  return bad
}

const NGINX = readFileSync(join(here, '../nginx.conf'), 'utf8')

test('every location that sets a header includes the shared snippets', () => {
  assert.deepEqual(problems(NGINX), [])
  assert.ok(locations(NGINX).length >= 6)
})

test('MUTATION: dropping the include from one location is detected', () => {
  const m = NGINX.replace(
    `add_header Cache-Control "public, immutable";\n        ${SEC}\n        ${RO}\n`,
    'add_header Cache-Control "public, immutable";\n',
  )
  assert.notEqual(m, NGINX)
  const p = problems(m)
  assert.equal(p.length, 2)
  assert.match(p[0], /_nuxt/)
})

test('MUTATION: a reintroduced inline CSP copy is detected', () => {
  const m = NGINX.replace(`${SEC}\n        ${RO}\n        try_files $uri $uri/ =404;`,
    `${SEC}\n        ${RO}\n        add_header Content-Security-Policy "default-src 'self';" always;\n        try_files $uri $uri/ =404;`)
  assert.notEqual(m, NGINX)
  assert.ok(problems(m).some((x) => /inline CSP/.test(x)))
})
