const input = document.getElementById('input');
const output = document.getElementById('output');
const status = document.getElementById('status');
const charCount = document.getElementById('char-count');
const wordCount = document.getElementById('word-count');
const lineCount = document.getElementById('line-count');
const readTime = document.getElementById('read-time');

const WORDS_PER_MINUTE = 200;
const MIN_READ_MINUTES = 1;

const SAMPLE = `# Hello, Markdown

Type on the left — this page updates live.

## Features

- **Bold**, _italic_, and \`inline code\`
- [Links](https://example.com) get linkified: https://claude.com
- Lists, tables, blockquotes, and fenced code

> Markdown in. Beautiful page out.

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`;
}
console.log(greet('world'));
\`\`\`

| Syntax | Support |
| ------ | :-----: |
| Tables | ✅ |
| Code   | ✅ |
`;

let timer = null;
let inflight = false;
let queued = false;

async function render() {
  if (inflight) {
    queued = true;
    return;
  }
  inflight = true;
  status.textContent = 'rendering…';
  try {
    const res = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown: input.value }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { html } = await res.json();
    output.innerHTML = html;
    status.textContent = 'ready';
  } catch (err) {
    status.textContent = 'error';
    console.error(err);
  } finally {
    inflight = false;
    if (queued) {
      queued = false;
      render();
    }
  }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(render, 150);
}

function computeStats(text) {
  const chars = text.length;
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const lines = text === '' ? 1 : text.split('\n').length;
  const minutes =
    words === 0
      ? MIN_READ_MINUTES
      : Math.max(MIN_READ_MINUTES, Math.ceil(words / WORDS_PER_MINUTE));
  return { chars, words, lines, minutes };
}

function updateStats() {
  const { chars, words, lines, minutes } = computeStats(input.value);
  charCount.textContent = `${chars} chars`;
  wordCount.textContent = words;
  lineCount.textContent = lines;
  readTime.textContent = `${minutes} min read`;
}

input.addEventListener('input', () => {
  updateStats();
  schedule();
});
input.value = SAMPLE;
updateStats();
render();
