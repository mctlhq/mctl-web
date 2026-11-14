// Runs scripts/validate.sh against a local stub of the template Worker and of
// the Cloudflare widgets API. The stub answers with the template's real wire
// format: templates/worker/src/index.ts pretty-prints every JSON body with
// JSON.stringify(body, null, 2), and a dummy token comes back as
// success:false + error-codes + _worker metadata. The first test pins that
// format to the template source, so the stub cannot silently drift from it.
//
// Run: node --test .claude/skills/turnstile-spin/tests/*.test.mjs  (needs jq)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(here, '..', 'scripts', 'validate.sh');
const TEMPLATE_INDEX = join(here, '..', 'templates', 'worker', 'src', 'index.ts');
const TEMPLATE_VALIDATE = join(here, '..', 'templates', 'worker', 'src', 'validate.ts');

const pretty = (body) => JSON.stringify(body, null, 2);

function healthyScenario() {
  return {
    health: { status: 200, body: pretty({ ok: true, version: '1.0.0', service: 'turnstile-siteverify' }) },
    dummy: {
      status: 200,
      body: pretty({
        success: false,
        'error-codes': ['invalid-input-response'],
        _worker: { duration_ms: 12, worker_version: '1.0.0' },
      }),
    },
    widget: { status: 200, body: pretty({ success: true, result: { domains: ['example.com', 'www.example.com'] } }) },
  };
}

async function runValidate(scenario) {
  const server = createServer((req, res) => {
    let entry;
    if (req.method === 'GET' && req.url === '/w/health') entry = scenario.health;
    else if (req.method === 'POST' && req.url === '/w/') entry = scenario.dummy;
    else if (req.method === 'GET' && req.url === '/cf/accounts/acc/challenges/widgets/sk') entry = scenario.widget;
    else entry = { status: 404, body: '{}' };
    req.resume();
    res.writeHead(entry.status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(entry.body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    return await new Promise((resolve) => {
      execFile(
        'bash',
        [SCRIPT, '--worker-url', `${base}/w`, '--account-id', 'acc', '--sitekey', 'sk',
          '--expected-domains', 'example.com,www.example.com'],
        { env: { ...process.env, CLOUDFLARE_API_TOKEN: 'test-token', CF_API_BASE: `${base}/cf` } },
        (err, stdout) => resolve({ code: err ? err.code : 0, out: JSON.parse(stdout.trim().split('\n').pop()) }),
      );
    });
  } finally {
    server.close();
  }
}

test('stub matches the template wire format (pretty JSON, _worker metadata)', () => {
  const src = readFileSync(TEMPLATE_INDEX, 'utf8');
  assert.match(src, /JSON\.stringify\(body, null, 2\)/);
  // A siteverify answer (dummy token included) carries _worker.worker_version.
  assert.match(readFileSync(TEMPLATE_VALIDATE, 'utf8'), /data\._worker = \{[^}]*worker_version: workerVersion/);
  assert.match(pretty({ ok: true }), /"ok": true/);
});

test('healthy template Worker passes every check', async () => {
  const r = await runValidate(healthyScenario());
  assert.deepEqual(r.out, { status: 'ok' });
  assert.equal(r.code, 0);
});

// The detector must also go red: each check fails on its own mutation.
const failures = [
  ['health ok:false', (s) => { s.health.body = pretty({ ok: false }); }, 'health'],
  ['health 500', (s) => { s.health.status = 500; }, 'health'],
  ['dummy token accepted', (s) => { s.dummy.body = pretty({ success: true, 'error-codes': [], _worker: { duration_ms: 1, worker_version: '1' } }); }, 'dummy_siteverify'],
  ['dummy without error-codes', (s) => { s.dummy.body = pretty({ success: false, 'error-codes': [], _worker: { duration_ms: 1, worker_version: '1' } }); }, 'dummy_siteverify'],
  ['dummy not JSON', (s) => { s.dummy.body = 'oops'; }, 'dummy_siteverify'],
  ['custom Worker without _worker', (s) => { s.dummy.body = pretty({ success: false, 'error-codes': ['invalid-input-response'] }); }, 'worker_metadata'],
  ['domain missing on widget', (s) => { s.widget.body = pretty({ success: true, result: { domains: ['example.com'] } }); }, 'hostname'],
  ['widget API unreadable', (s) => { s.widget.body = pretty({ success: false, errors: [{ code: 10000 }] }); }, 'hostname'],
];

for (const [name, mutate, check] of failures) {
  test(`fails on: ${name}`, async () => {
    const s = healthyScenario();
    mutate(s);
    const r = await runValidate(s);
    assert.equal(r.code, 1);
    assert.equal(r.out.status, 'error');
    assert.equal(r.out.check, check);
  });
}
