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

async function postJson(base, pathname, payload) {
  return fetch(`${base}${pathname}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
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

test('POST /api/render with a JSON body {markdown} returns {html} with headings, lists, links, and tables converted', async () => {
  await withApp(async (base) => {
    const markdown = [
      '# Title',
      '',
      '- first',
      '- second',
      '',
      '[OpenAI](https://openai.com)',
      '',
      '| Name | Value |',
      '| --- | --- |',
      '| one | two |',
    ].join('\n');

    const res = await postJson(base, '/api/render', { markdown });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.match(body.html, /<h1[^>]*>Title<\/h1>/);
    assert.match(body.html, /<ul>/);
    assert.match(body.html, /<a href="https:\/\/openai\.com">OpenAI<\/a>/);
    assert.match(body.html, /<table>/);
  });
});

test('POST /api/render escapes raw HTML in the input so script tags are not executed', async () => {
  await withApp(async (base) => {
    const res = await postJson(base, '/api/render', {
      markdown: '<script>alert(1)</script>',
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.match(body.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(body.html, /<script>/);
  });
});

test('POST /api/render returns {html:""} with status 200 when markdown is missing or not a string', async () => {
  await withApp(async (base) => {
    const missing = await postJson(base, '/api/render', {});
    assert.equal(missing.status, 200);
    assert.deepEqual(await missing.json(), { html: '' });

    const nonString = await postJson(base, '/api/render', { markdown: 42 });
    assert.equal(nonString.status, 200);
    assert.deepEqual(await nonString.json(), { html: '' });
  });
});

test('POST /api/render returns a JSON error with status 413 when the request body exceeds the configured size limit', async () => {
  await withApp(async (base) => {
    const markdown = 'a'.repeat(2 * 1024 * 1024 + 1);
    const res = await postJson(base, '/api/render', { markdown });
    assert.equal(res.status, 413);
    assert.match(res.headers.get('content-type'), /application\/json/);

    const body = await res.json();
    assert.match(body.error, /exceeds the 2mb json limit/i);
    assert.doesNotMatch(body.error, /PayloadTooLargeError|node_modules|raw-body|at /);
  });
});

test('POST /api/render renders Markdown tables and blockquotes as block-level HTML', async () => {
  await withApp(async (base) => {
    const markdown = [
      '> quoted text',
      '',
      '| Name | Value |',
      '| --- | --- |',
      '| one | two |',
    ].join('\n');

    const res = await postJson(base, '/api/render', { markdown });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.match(body.html, /<blockquote>\s*<p>quoted text<\/p>\s*<\/blockquote>/);
    assert.match(body.html, /<table>/);
  });
});

test('a fenced code block with a known language renders with per-token highlight markup', async () => {
  await withApp(async (base) => {
    const markdown = ['```js', 'const x = 1;', '```'].join('\n');

    const res = await postJson(base, '/api/render', { markdown });
    assert.equal(res.status, 200);

    const body = await res.json();
    // highlight.js wraps tokens in <span class="hljs-keyword"> etc.; the code
    // block carries the hljs language class so the theme can target it.
    // The code block carries the hljs class (for the theme) plus the
    // language class, and highlight.js wraps tokens in hljs-* spans.
    assert.match(body.html, /<code class="hljs language-js">/);
    assert.match(body.html, /<span class="hljs-keyword">const<\/span>/);
  });
});

test('a fenced code block with an unknown or missing language renders as escaped plain code, with no error', async () => {
  await withApp(async (base) => {
    const unknown = await postJson(base, '/api/render', {
      markdown: ['```totally-not-a-language', '<b>not html</b>', '```'].join('\n'),
    });
    assert.equal(unknown.status, 200);
    const unknownBody = await unknown.json();
    // No highlight spans; the angle brackets are escaped, not rendered.
    assert.doesNotMatch(unknownBody.html, /<span class="hljs/);
    assert.match(unknownBody.html, /&lt;b&gt;not html&lt;\/b&gt;/);

    const missing = await postJson(base, '/api/render', {
      markdown: ['```', '<i>still escaped</i>', '```'].join('\n'),
    });
    assert.equal(missing.status, 200);
    const missingBody = await missing.json();
    assert.doesNotMatch(missingBody.html, /<span class="hljs/);
    assert.match(missingBody.html, /&lt;i&gt;still escaped&lt;\/i&gt;/);
  });
});

test('a highlight theme stylesheet is served and applies to code blocks in the preview', async () => {
  await withApp(async (base) => {
    const theme = await fetch(`${base}/vendor/hljs/github.css`);
    assert.equal(theme.status, 200);
    assert.match(theme.headers.get('content-type'), /text\/css/);
    const css = await theme.text();
    // The theme rules target the hljs classes the highlighter emits.
    assert.match(css, /\.hljs/);

    const page = await fetch(`${base}/`);
    const html = await page.text();
    // The app shell links the theme stylesheet so highlighting is visible.
    assert.match(html, /<link rel="stylesheet" href="\/vendor\/hljs\/github\.css"/);
  });
});
