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

test('issue 13 shell renders a titled header bar, split editor/preview, and footer bar in the app frame', () => {
  const dom = buildDOM();
  const doc = dom.window.document;
  const shell = doc.querySelector('.app-shell');
  const header = doc.querySelector('.topbar');
  const input = doc.getElementById('input');
  const output = doc.getElementById('output');
  const footer = doc.querySelector('.footerbar');

  assert.ok(shell, 'the app frame must exist');
  assert.ok(header, 'the header bar must exist');
  assert.match(header.textContent, /Markdown E-Ink Console/);
  assert.ok(input, '#input textarea must exist');
  assert.equal(input.tagName, 'TEXTAREA');
  assert.ok(output, '#output preview pane must exist');
  assert.ok(footer, 'the footer bar must exist');
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
  const previousError = console.error;
  console.error = () => {};
  try {
    bootApp(dom, fetchMock);

    const status = doc.getElementById('status');
    const output = doc.getElementById('output');

    await new Promise((r) => setTimeout(r, 200));

    assert.equal(status.textContent, 'error', 'status must show error state');
    assert.equal(output.innerHTML, '', 'preview must not show broken HTML');
  } finally {
    console.error = previousError;
  }
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

test('editor header shows a character count and the footer shows word, line, and read-time readouts', async () => {
  const dom = buildDOM();
  const doc = dom.window.document;
  const fetchMock = async () =>
    new Response(JSON.stringify({ html: '<p>ok</p>' }), {
      headers: { 'content-type': 'application/json' },
    });
  bootApp(dom, fetchMock);
  await new Promise((r) => setTimeout(r, 50));

  const charEl = doc.getElementById('char-count');
  const wordEl = doc.getElementById('word-count');
  const lineEl = doc.getElementById('line-count');
  const readEl = doc.getElementById('read-time');
  assert.ok(charEl, '#char-count must exist in the editor header');
  assert.ok(wordEl, '#word-count must exist in the footer');
  assert.ok(lineEl, '#line-count must exist in the footer');
  assert.ok(readEl, '#read-time must exist in the footer');

  for (const el of [charEl, wordEl, lineEl, readEl]) {
    assert.ok(el.textContent.trim() !== '', 'readout must not be blank');
    assert.ok(!/NaN/i.test(el.textContent), 'readout must not be NaN');
  }
});

test('all four readouts update live as the user edits the document', async () => {
  const dom = buildDOM();
  const doc = dom.window.document;
  const fetchMock = async () =>
    new Response(JSON.stringify({ html: '<p>ok</p>' }), {
      headers: { 'content-type': 'application/json' },
    });
  bootApp(dom, fetchMock);
  await new Promise((r) => setTimeout(r, 50));

  const input = doc.getElementById('input');
  const charEl = doc.getElementById('char-count');
  const wordEl = doc.getElementById('word-count');
  const lineEl = doc.getElementById('line-count');
  const readEl = doc.getElementById('read-time');

  const before = {
    chars: charEl.textContent,
    words: wordEl.textContent,
    lines: lineEl.textContent,
    read: readEl.textContent,
  };

  input.value = 'one two three four five';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

  assert.notEqual(charEl.textContent, before.chars, 'char count must update');
  assert.notEqual(wordEl.textContent, before.words, 'word count must update');
  assert.notEqual(lineEl.textContent, before.lines, 'line count must update');
  assert.equal(wordEl.textContent, '5', 'word count must reflect the new text');

  // a longer edit must move the read time off the sample's value
  input.value = Array.from({ length: 250 }, () => 'word').join(' ');
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.notEqual(readEl.textContent, before.read, 'read time must update');
  assert.equal(readEl.textContent, '2 min read', 'read time reflects the longer document');
});

test('an empty document shows 0 chars, 0 words, 1 line, and the minimum read time — never blank or NaN', async () => {
  const dom = buildDOM();
  const doc = dom.window.document;
  const fetchMock = async () =>
    new Response(JSON.stringify({ html: '' }), {
      headers: { 'content-type': 'application/json' },
    });
  bootApp(dom, fetchMock);
  await new Promise((r) => setTimeout(r, 50));

  const input = doc.getElementById('input');
  input.value = '';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

  const charEl = doc.getElementById('char-count');
  const wordEl = doc.getElementById('word-count');
  const lineEl = doc.getElementById('line-count');
  const readEl = doc.getElementById('read-time');

  assert.equal(charEl.textContent, '0 chars', 'empty doc → 0 characters');
  assert.equal(wordEl.textContent, '0', 'empty doc → 0 words');
  assert.equal(lineEl.textContent, '1', 'empty doc → 1 line');
  assert.equal(readEl.textContent, '1 min read', 'empty doc → minimum read time');
  for (const el of [charEl, wordEl, lineEl, readEl]) {
    assert.ok(el.textContent.trim() !== '', 'never blank');
    assert.ok(!/NaN/i.test(el.textContent), 'never NaN');
  }
});

test('read time is derived from word count and is at least the minimum for any non-empty document', async () => {
  const dom = buildDOM();
  const doc = dom.window.document;
  const fetchMock = async () =>
    new Response(JSON.stringify({ html: '' }), {
      headers: { 'content-type': 'application/json' },
    });
  bootApp(dom, fetchMock);
  await new Promise((r) => setTimeout(r, 50));

  const input = doc.getElementById('input');
  const readEl = doc.getElementById('read-time');
  const wordEl = doc.getElementById('word-count');

  const WPM = 200;
  const MIN = 1;

  // a short non-empty document: derived read time is below the minimum, so the floor applies
  input.value = 'only a few words here';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const wordsShort = Number(wordEl.textContent);
  assert.equal(readEl.textContent, `${MIN} min read`, 'short doc clamps to the minimum read time');
  assert.ok(wordsShort > 0, 'non-empty doc has words');

  // a long document: read time grows with the word count (ceil(words / WPM))
  const longText = Array.from({ length: 500 }, () => 'word').join(' ');
  input.value = longText;
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const wordsLong = Number(wordEl.textContent);
  const expectedLong = Math.max(MIN, Math.ceil(wordsLong / WPM));
  assert.equal(wordsLong, 500, 'word count for the long document');
  assert.equal(readEl.textContent, `${expectedLong} min read`, 'read time tracks the word count');
  assert.ok(Number(expectedLong) >= MIN, 'read time is never below the minimum');
});
