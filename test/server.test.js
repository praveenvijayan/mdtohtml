import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, '..', 'server.js');

// Starts createApp() on an OS-assigned port so per-test requests never collide.
async function withApp(fn) {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// Spawns the real `node server.js` entrypoint (the only place the PORT/3000
// default is applied) and polls until it accepts connections or times out.
async function withSpawnedServer(env, fn) {
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, ...env },
    stdio: 'pipe',
  });
  try {
    const deadline = Date.now() + 5000;
    let base;
    for (const port of [env.PORT || '3000']) {
      base = `http://127.0.0.1:${port}`;
    }
    let lastErr;
    while (Date.now() < deadline) {
      try {
        await fetch(base);
        lastErr = undefined;
        break;
      } catch (err) {
        lastErr = err;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    if (lastErr) throw lastErr;
    await fn(base);
  } finally {
    child.kill();
    await new Promise((resolve) => child.once('exit', resolve));
  }
}

test('GET / returns 200 with an HTML document', async () => {
  await withApp(async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /html/);
    const body = await res.text();
    assert.match(body.trim(), /^<!doctype html>/i);
  });
});

test('server listens on process.env.PORT, defaulting to 3000', async () => {
  await withSpawnedServer({ PORT: '' }, async (base) => {
    assert.equal(base, 'http://127.0.0.1:3000');
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
  });

  const customPort = '4173';
  await withSpawnedServer({ PORT: customPort }, async (base) => {
    assert.equal(base, `http://127.0.0.1:${customPort}`);
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
  });
});

test('a static file placed in public/ is served with its correct content-type', async () => {
  await withApp(async (base) => {
    const res = await fetch(`${base}/style.css`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/css/);
  });
});

test('a request to an unknown path returns 404 without leaking a stack trace', async () => {
  await withApp(async (base) => {
    const res = await fetch(`${base}/does/not/exist`);
    assert.equal(res.status, 404);
    const body = await res.text();
    assert.doesNotMatch(body, /at [\w$.]+ \(/); // no "at Function (file:line:col)" stack frames
    assert.doesNotMatch(body, new RegExp(__dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});
