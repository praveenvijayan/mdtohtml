const input = document.getElementById('input');
const output = document.getElementById('output');
const status = document.getElementById('status');

const SAMPLE = `# Field Notes

Draft in the left bay. The preview plate restamps the page in place.

---

## Apparatus

- **Bold**, _italic_, and \`inline code\`
- [Links](https://example.com) stay readable on the paper stock
- Tables, blockquotes, and fenced code keep their chrome

> Markdown in, paper preview out.

\`\`\`js
function stamp(label) {
  return \`[ink] \${label}\`;
}

console.log(stamp('ready'));
\`\`\`

| Surface | Finish |
| ------- | ------ |
| Header  | etched |
| Preview | inked  |
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
  status.textContent = 'rendering';
  status.dataset.state = 'rendering';
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
    status.dataset.state = 'ready';
  } catch (err) {
    status.textContent = 'error';
    status.dataset.state = 'error';
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
