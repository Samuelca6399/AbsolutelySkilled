import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const SKILLS_DIR = path.resolve(process.cwd(), '../skills');
const OG_DIR = path.resolve(process.cwd(), 'public/og');
const FONTS_DIR = path.resolve(process.cwd(), 'scripts/fonts');
const WIDTH = 1200;
const HEIGHT = 630;

const CATEGORY_COLORS: Record<string, string> = {
  engineering: '#3b82f6',
  operations: '#f97316',
  marketing: '#ec4899',
  'ai-ml': '#a855f7',
  design: '#06b6d4',
  product: '#22c55e',
  devtools: '#eab308',
  sales: '#ef4444',
  data: '#14b8a6',
  infra: '#6366f1',
  monitoring: '#84cc16',
  cloud: '#0ea5e9',
  writing: '#f59e0b',
  workflow: '#10b981',
  analytics: '#8b5cf6',
  'game-development': '#d946ef',
  'developer-tools': '#eab308',
  communication: '#64748b',
  video: '#f43f5e',
};

const CATEGORY_LABELS: Record<string, string> = {
  engineering: 'Software Engineering',
  operations: 'Operations',
  marketing: 'Marketing',
  'ai-ml': 'AI & ML',
  design: 'UI/UX & Design',
  product: 'Product',
  devtools: 'Developer Tools',
  sales: 'Sales',
  data: 'Data Engineering',
  infra: 'Infrastructure',
  monitoring: 'Monitoring',
  cloud: 'Cloud',
  writing: 'Technical Writing',
  workflow: 'Workflow',
  analytics: 'Analytics',
  'game-development': 'Game Dev',
  'developer-tools': 'Developer Tools',
  communication: 'Communication',
  video: 'Video Creation',
};

// Helper to build satori-compatible virtual DOM nodes
function h(
  type: string,
  style: Record<string, unknown>,
  ...children: (object | string)[]
): object {
  if (children.length === 0) {
    return { type, props: { style } };
  }
  return { type, props: { style, children: children.length === 1 ? children[0] : children } };
}

function buildSkillOgMarkup(
  name: string,
  description: string,
  category: string,
  tags: string[],
): object {
  const catColor = CATEGORY_COLORS[category] || '#64748b';
  const catLabel = CATEGORY_LABELS[category] || category;
  const displayTags = tags.slice(0, 4);
  const desc = description.length > 120 ? description.slice(0, 117) + '...' : description;
  const fontSize = name.length > 30 ? 42 : name.length > 20 ? 52 : 60;

  return h(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '60px 64px',
      backgroundColor: '#0a0a0f',
      backgroundImage:
        'radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(168,85,247,0.06) 0%, transparent 50%)',
      fontFamily: 'Inter',
    },
    // Top section
    h(
      'div',
      { display: 'flex', flexDirection: 'column', gap: '20px' },
      // Category + AI Agent Skill badges
      h(
        'div',
        { display: 'flex', alignItems: 'center', gap: '12px' },
        h(
          'div',
          {
            display: 'flex',
            padding: '6px 16px',
            borderRadius: '100px',
            border: `1.5px solid ${catColor}44`,
            backgroundColor: `${catColor}15`,
            color: catColor,
            fontSize: '16px',
            fontWeight: 600,
          },
          catLabel,
        ),
        h(
          'div',
          {
            display: 'flex',
            padding: '6px 14px',
            borderRadius: '100px',
            border: '1.5px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '14px',
          },
          'AI Agent Skill',
        ),
      ),
      // Skill name
      h(
        'div',
        {
          fontFamily: 'JetBrains Mono',
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          color: '#f0f0f5',
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
        },
        name,
      ),
      // Description
      h(
        'div',
        {
          fontSize: '20px',
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.5,
          maxWidth: '900px',
        },
        desc,
      ),
    ),
    // Bottom section
    h(
      'div',
      { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
      // Tags
      h(
        'div',
        { display: 'flex', gap: '8px' },
        ...displayTags.map((tag) =>
          h(
            'div',
            {
              fontFamily: 'JetBrains Mono',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.35)',
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.08)',
              backgroundColor: 'rgba(255,255,255,0.03)',
            },
            `#${tag}`,
          ),
        ),
      ),
      // Brand
      h(
        'div',
        { display: 'flex', alignItems: 'center', gap: '10px' },
        h('div', {
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
        }),
        h(
          'div',
          {
            fontFamily: 'JetBrains Mono',
            fontSize: '18px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.6)',
          },
          'AbsolutelySkilled',
        ),
      ),
    ),
  );
}

function buildDefaultOgMarkup(): object {
  return h(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 64px',
      backgroundColor: '#0a0a0f',
      backgroundImage:
        'radial-gradient(ellipse at 50% 30%, rgba(59,130,246,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(168,85,247,0.08) 0%, transparent 50%)',
      fontFamily: 'Inter',
    },
    h('div', {
      width: '64px',
      height: '64px',
      borderRadius: '16px',
      background: 'linear-gradient(135deg, #3b82f6, #a855f7, #ec4899)',
      marginBottom: '32px',
    }),
    h(
      'div',
      {
        fontFamily: 'JetBrains Mono',
        fontSize: '64px',
        fontWeight: 700,
        color: '#f0f0f5',
        letterSpacing: '-0.03em',
        textAlign: 'center',
      },
      'AbsolutelySkilled',
    ),
    h(
      'div',
      {
        fontSize: '26px',
        color: 'rgba(255,255,255,0.5)',
        marginTop: '16px',
        textAlign: 'center',
      },
      'Teach your AI agent anything.',
    ),
    h(
      'div',
      {
        display: 'flex',
        gap: '24px',
        marginTop: '40px',
        fontSize: '18px',
        color: 'rgba(255,255,255,0.35)',
      },
      h('span', {}, '168+ Skills'),
      h('span', {}, '|'),
      h('span', {}, '20 Categories'),
      h('span', {}, '|'),
      h('span', {}, 'Open Source'),
    ),
  );
}

async function renderOgImage(
  markup: object,
  fonts: { inter: ArrayBuffer; interRegular: ArrayBuffer; mono: ArrayBuffer },
): Promise<Buffer> {
  const svg = await satori(markup as React.ReactNode, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Inter', data: fonts.inter, weight: 700, style: 'normal' as const },
      { name: 'Inter', data: fonts.interRegular, weight: 400, style: 'normal' as const },
      { name: 'JetBrains Mono', data: fonts.mono, weight: 700, style: 'normal' as const },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width' as const, value: WIDTH },
  });
  return resvg.render().asPng();
}

async function main() {
  console.log('Loading fonts...');
  const inter = fs.readFileSync(path.join(FONTS_DIR, 'inter-bold.ttf')).buffer as ArrayBuffer;
  const interRegular = fs.readFileSync(path.join(FONTS_DIR, 'inter-regular.ttf')).buffer as ArrayBuffer;
  const mono = fs.readFileSync(path.join(FONTS_DIR, 'jetbrains-mono-bold.ttf')).buffer as ArrayBuffer;
  const fonts = { inter, interRegular, mono };

  // Ensure output directory
  if (!fs.existsSync(OG_DIR)) {
    fs.mkdirSync(OG_DIR, { recursive: true });
  }

  // Generate default OG image
  console.log('Generating default OG image...');
  const defaultMarkup = buildDefaultOgMarkup();
  const defaultPng = await renderOgImage(defaultMarkup, fonts);
  fs.writeFileSync(path.join(OG_DIR, 'default.png'), defaultPng);

  // Read all skills
  const slugs = fs.readdirSync(SKILLS_DIR).filter((d) =>
    fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md')),
  );

  console.log(`Generating OG images for ${slugs.length} skills...`);
  let count = 0;

  // Process in batches to avoid memory pressure
  const BATCH_SIZE = 20;
  for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
    const batch = slugs.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (slug) => {
        try {
          const raw = fs.readFileSync(path.join(SKILLS_DIR, slug, 'SKILL.md'), 'utf-8');
          const { data } = matter(raw);

          const name = data.name || slug;
          const description = (data.description || '')
            .replace(/^Use this skill when\s*/i, '')
            .replace(/\.?\s*Triggers on\b.*/i, '')
            .replace(/\.?\s*Also triggers on\b.*/i, '')
            .trim();
          const category = data.category || 'engineering';
          const tags: string[] = data.tags || [];

          const markup = buildSkillOgMarkup(name, description, category, tags);
          const png = await renderOgImage(markup, fonts);
          fs.writeFileSync(path.join(OG_DIR, `${slug}.png`), png);
          count++;
        } catch (err) {
          console.error(`Error generating OG for ${slug}:`, err);
        }
      }),
    );
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, slugs.length)}/${slugs.length}\r`);
  }

  console.log(`\nGenerated ${count} skill OG images + 1 default`);
}

main();
