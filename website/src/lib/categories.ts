export interface CategoryMeta {
  slug: string;
  label: string;
  color: string;
  icon: string;
  description: string;
}

export const CATEGORIES: Record<string, CategoryMeta> = {
  engineering: {
    slug: 'engineering',
    label: 'Software Engineering',
    color: '#3b82f6',
    icon: '{ }',
    description:
      'Software engineering skills that help AI agents write clean, tested, production-ready code. Covers React, TypeScript, system design, API development, testing, and more.',
  },
  operations: {
    slug: 'operations',
    label: 'Operations',
    color: '#f97316',
    icon: '...',
    description:
      'Operations skills for AI agents covering project management, agile workflows, hiring, compliance, and business process optimization.',
  },
  marketing: {
    slug: 'marketing',
    label: 'Marketing',
    color: '#ec4899',
    icon: '...',
    description:
      'Marketing skills for AI agents spanning SEO, content strategy, email marketing, social media, growth hacking, and competitive analysis.',
  },
  'ai-ml': {
    slug: 'ai-ml',
    label: 'AI & Machine Learning',
    color: '#a855f7',
    icon: '...',
    description:
      'AI and machine learning skills for building LLM apps, prompt engineering, computer vision, NLP, and ML operations pipelines.',
  },
  design: {
    slug: 'design',
    label: 'UI/UX & Design',
    color: '#06b6d4',
    icon: '...',
    description:
      'Design skills for AI agents covering UI/UX design, accessibility, responsive layouts, design systems, color theory, and motion design.',
  },
  product: {
    slug: 'product',
    label: 'Product Management',
    color: '#22c55e',
    icon: '...',
    description:
      'Product management skills for AI agents including product strategy, user stories, product analytics, discovery, and launch planning.',
  },
  devtools: {
    slug: 'devtools',
    label: 'Developer Tools',
    color: '#eab308',
    icon: '...',
    description:
      'Developer tools skills for AI agents covering CLI design, Git workflows, debugging, shell scripting, Vim/Neovim, and monorepo management.',
  },
  sales: {
    slug: 'sales',
    label: 'Sales',
    color: '#ef4444',
    icon: '...',
    description:
      'Sales skills for AI agents spanning CRM management, sales playbooks, lead scoring, pricing strategy, and sales enablement.',
  },
  data: {
    slug: 'data',
    label: 'Data Engineering',
    color: '#14b8a6',
    icon: '...',
    description:
      'Data engineering skills for AI agents covering data pipelines, data quality, warehousing, analytics engineering, and real-time streaming.',
  },
  infra: {
    slug: 'infra',
    label: 'Infrastructure',
    color: '#6366f1',
    icon: '...',
    description:
      'Infrastructure skills for AI agents covering Docker, Kubernetes, Terraform, CI/CD pipelines, and cloud architecture.',
  },
  monitoring: {
    slug: 'monitoring',
    label: 'Monitoring',
    color: '#84cc16',
    icon: '...',
    description:
      'Monitoring and observability skills for AI agents covering logging, metrics, distributed tracing, alerting, and site reliability engineering.',
  },
  cloud: {
    slug: 'cloud',
    label: 'Cloud',
    color: '#0ea5e9',
    icon: '...',
    description:
      'Cloud computing skills for AI agents spanning AWS, GCP, cloud security, and cloud-native architecture patterns.',
  },
  writing: {
    slug: 'writing',
    label: 'Technical Writing',
    color: '#f59e0b',
    icon: '...',
    description:
      'Technical writing skills for AI agents covering documentation, internal docs, API references, tutorials, and developer-facing prose.',
  },
  workflow: {
    slug: 'workflow',
    label: 'Workflow',
    color: '#10b981',
    icon: '...',
    description:
      'Workflow automation skills for AI agents covering no-code tools, process automation, and productivity optimization.',
  },
  analytics: {
    slug: 'analytics',
    label: 'Analytics',
    color: '#8b5cf6',
    icon: '...',
    description:
      'Analytics skills for AI agents covering product analytics, SaaS metrics, data science, and business intelligence.',
  },
  'game-development': {
    slug: 'game-development',
    label: 'Game Development',
    color: '#d946ef',
    icon: '...',
    description:
      'Game development skills for AI agents covering Unity, game design patterns, game audio, balancing, and pixel art.',
  },
  'developer-tools': {
    slug: 'developer-tools',
    label: 'Developer Tools',
    color: '#eab308',
    icon: '...',
    description:
      'Developer tools skills for building better developer experiences, SDKs, and tooling.',
  },
  communication: {
    slug: 'communication',
    label: 'Communication',
    color: '#64748b',
    icon: '...',
    description:
      'Communication skills for AI agents covering internal communications, remote collaboration, and team alignment.',
  },
  video: {
    slug: 'video',
    label: 'Video Creation',
    color: '#f43f5e',
    icon: '...',
    description:
      'Video creation skills for AI agents covering scriptwriting, Remotion video generation, audio design, and video analysis.',
  },
};

export function getCategoryMeta(category: string): CategoryMeta {
  return (
    CATEGORIES[category] || {
      slug: category,
      label: category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' '),
      color: '#64748b',
      icon: '...',
      description: '',
    }
  );
}
