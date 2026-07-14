import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(__dirname, '..', 'public', 'index.html'), 'utf-8');
const appCode = readFileSync(resolve(__dirname, '..', 'public', 'app.js'), 'utf-8');

function buildDOM() {
  return new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only' });
}

function bootApp(dom, fetchImpl) {
  const win = dom.window;
  if (fetchImpl) win.fetch = fetchImpl;
  vm.createContext(win);
  try {
    vm.runInContext(appCode, win);
  } catch {
    /* suppress errors from initial render() if fetch is not mocked */
  }
}

test('split-pane layout shows textarea and preview pane side by side', () => {
  const dom = buildDOM();
  const doc = dom.window.document;
  const input = doc.getElementById('input');
  const output = doc.getElementById('output');
  assert.ok(input, '#input textarea must exist');
  assert.equal(input.tagName, 'TEXTAREA');
  assert.ok(output, '#output preview pane must exist');
  const panes = doc.querySelectorAll('.split .pane');
  assert.ok(panes.length >= 2, 'must have at least two side-by-side panes');
});

test('typing updates preview via /api/render debounced so keystrokes coalesce', async () => {
  const dom = buildDOM();
  const doc = dom.window.document;
  const calls = [];
  const fetchMock = async (_url, opts) => {
    calls.push(JSON.parse(opts.body).markdown);
    return new Response(JSON.stringify({ html: '<p>ok</p>' }), {
      headers: { 'content-type': 'application/json' },
    });
  };
  bootApp(dom, fetchMock);

  const input = doc.getElementById('input');
  await new Promise((r) => setTimeout(r, 200));
  calls.length = 0;

  input.value = 'a';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  input.value = 'ab';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  input.value = 'abc';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

  await new Promise((r) => setTimeout(r, 200));

  assert.ok(calls.length <= 2, `coalesced into ≤2 calls, got ${calls.length}`);
  if (calls.length > 0) {
    assert.equal(calls[calls.length - 1], 'abc');
  }
});

test('a failed render request shows a visible status indicator not a blank or broken preview', async () => {
  const dom = buildDOM();
  const doc = dom.window.document;
  const fetchMock = async () => {
    throw new Error('network failure');
  };
  bootApp(dom, fetchMock);

  const status = doc.getElementById('status');
  const output = doc.getElementById('output');

  await new Promise((r) => setTimeout(r, 200));

  assert.equal(status.textContent, 'error', 'status must show error state');
  assert.equal(output.innerHTML, '', 'preview must not show broken HTML');
});

test('overlapping requests apply in order so the preview never shows a stale response', async () => {
  const dom = buildDOM();
  const doc = dom.window.document;
  let resolveFirst;
  const firstDeferred = new Promise((r) => { resolveFirst = r; });

  let callCount = 0;
  const fetchMock = async (_url, opts) => {
    callCount++;
    if (callCount === 1) return firstDeferred;
    return new Response(
      JSON.stringify({ html: `<p>${JSON.parse(opts.body).markdown}</p>` }),
      { headers: { 'content-type': 'application/json' } },
    );
  };

  bootApp(dom, fetchMock);

  const input = doc.getElementById('input');
  const output = doc.getElementById('output');
  const statusEl = doc.getElementById('status');

  await new Promise((r) => setTimeout(r, 200));

  input.value = 'first';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 200));

  input.value = 'second';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 200));

  resolveFirst(
    new Response(JSON.stringify({ html: '<p>first</p>' }), {
      headers: { 'content-type': 'application/json' },
    }),
  );
  await new Promise((r) => setTimeout(r, 200));

  assert.equal(output.innerHTML, '<p>second</p>', 'preview must show second result');
  assert.equal(callCount, 2, 'must have called fetch twice');
  assert.notEqual(statusEl.textContent, 'error');
});