const input = document.getElementById('input');
const output = document.getElementById('output');
const status = document.getElementById('status');
const charCount = document.getElementById('char-count');
const wordCount = document.getElementById('word-count');
const lineCount = document.getElementById('line-count');
const readTime = document.getElementById('read-time');
const topbar = document.querySelector('.topbar');
const hudToggle = document.getElementById('hud-toggle');
const headerHud = document.getElementById('header-hud');
const clockTime = document.getElementById('clock-time');
const clockDate = document.getElementById('clock-date');

const WORDS_PER_MINUTE = 200;
const MIN_READ_MINUTES = 1;
const RENDER_DEBOUNCE_MS = 150;
const CLOCK_REFRESH_MS = 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

let renderTimer = null;
let clockTimer = null;
let hudObserver = null;
let inflight = false;
let queued = false;

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function formatHud(now) {
  return {
    time: `${padNumber(now.getHours())}:${padNumber(now.getMinutes())}`,
    date: `${padNumber(now.getDate())} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
  };
}

function setHudHidden(hidden) {
  headerHud.hidden = hidden;
  hudToggle.textContent = hidden ? 'Show clock' : 'Hide clock';
  hudToggle.setAttribute('aria-expanded', String(!hidden));
  hudToggle.setAttribute('aria-pressed', String(!hidden));
}

function updateHud(now = new Date()) {
  const hud = formatHud(now);
  clockTime.textContent = hud.time;
  clockDate.textContent = hud.date;
}

function isHudMounted() {
  return Boolean(document.body?.contains(headerHud));
}

function cleanupHeaderHud() {
  if (clockTimer !== null) {
    clearInterval(clockTimer);
    clockTimer = null;
  }

  if (hudObserver) {
    hudObserver.disconnect();
    hudObserver = null;
  }

  window.removeEventListener('pagehide', cleanupHeaderHud);
}

function mountHeaderHud() {
  if (!topbar || !hudToggle || !headerHud || !clockTime || !clockDate) {
    return;
  }

  setHudHidden(false);
  updateHud();

  hudToggle.addEventListener('click', () => {
    setHudHidden(!headerHud.hidden);
  });

  clockTimer = setInterval(() => {
    if (!isHudMounted()) {
      cleanupHeaderHud();
      return;
    }

    updateHud();
  }, CLOCK_REFRESH_MS);
  clockTimer?.unref?.();

  hudObserver = new MutationObserver(() => {
    if (!isHudMounted()) {
      cleanupHeaderHud();
    }
  });
  hudObserver.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('pagehide', cleanupHeaderHud);
}

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

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

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
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, RENDER_DEBOUNCE_MS);
}

function computeStats(text) {
  const chars = text.length;
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const lines = text === '' ? 1 : text.split('\n').length;
  const minutes = words === 0
    ? MIN_READ_MINUTES
    : Math.max(MIN_READ_MINUTES, Math.ceil(words / WORDS_PER_MINUTE));

  return { chars, words, lines, minutes };
}

function updateStats() {
  const { chars, words, lines, minutes } = computeStats(input.value);
  charCount.textContent = `${chars} chars`;
  wordCount.textContent = String(words);
  lineCount.textContent = String(lines);
  readTime.textContent = `${minutes} min read`;
}

input.addEventListener('input', () => {
  updateStats();
  schedule();
});

input.value = SAMPLE;
updateStats();
mountHeaderHud();
render();
