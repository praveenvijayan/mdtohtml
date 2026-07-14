import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// html:false — raw HTML in the input is escaped, not rendered. Pasted Markdown
// is untrusted, so this closes the obvious XSS hole. markdown-it still handles
// links, images, tables, etc. Code blocks are highlighted by highlight.js,
// whose output is already escaped.
export const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch {
        /* fall through to default escaping */
      }
    }
    return ''; // let markdown-it escape it
  },
});

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(express.static(path.join(__dirname, 'public')));
  // highlight.js ships its themes; serve them straight from the package.
  app.use(
    '/vendor/hljs',
    express.static(path.join(__dirname, 'node_modules/highlight.js/styles')),
  );

  app.post('/api/render', (req, res) => {
    const markdown = typeof req.body?.markdown === 'string' ? req.body.markdown : '';
    res.json({ html: md.render(markdown) });
  });

  return app;
}

// Only listen when run directly, so tests can import createApp without a port.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => {
    console.log(`mdtohtml → http://localhost:${port}`);
  });
}
