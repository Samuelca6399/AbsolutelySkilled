import { marked, type TokenizerAndRendererExtension } from 'marked';
import { createHighlighter, type Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs: [
        'javascript',
        'typescript',
        'bash',
        'shell',
        'json',
        'yaml',
        'markdown',
        'python',
        'html',
        'css',
        'go',
        'rust',
        'ruby',
        'sql',
        'toml',
        'diff',
        'jsx',
        'tsx',
      ],
    });
  }
  return highlighterPromise;
}

// Pre-initialize the highlighter at module load
const hl = await getHighlighter();

const renderer = new marked.Renderer();

renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  const language = lang || 'text';
  try {
    const supported = hl.getLoadedLanguages();
    if (supported.includes(language as never)) {
      return hl.codeToHtml(text, { lang: language, theme: 'github-dark' });
    }
  } catch {
    // Fall through to plain rendering
  }
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<pre class="shiki github-dark" style="background-color:#24292e;color:#e1e4e8"><code>${escaped}</code></pre>`;
};

marked.setOptions({
  gfm: true,
  breaks: false,
  renderer,
});

export function renderMarkdown(content: string): string {
  return marked.parse(content) as string;
}
