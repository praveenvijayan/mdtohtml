const input = document.getElementById('input');
const output = document.getElementById('output');
const status = document.getElementById('status');

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

input.addEventListener('input', schedule);
input.value = SAMPLE;
render();
