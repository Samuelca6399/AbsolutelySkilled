import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export interface Skill {
  slug: string;
  name: string;
  version: string;
  description: string;
  category: string;
  tags: string[];
  recommended_skills: string[];
  platforms: string[];
  license: string;
  maintainers: { github: string }[];
  body: string;
  readme: string | null;
  references: { filename: string; content: string }[];
}

const SKILLS_DIR = path.resolve(process.cwd(), '../skills');

export function getAllSkills(): Skill[] {
  const dirs = fs.readdirSync(SKILLS_DIR).filter((d) => {
    const skillPath = path.join(SKILLS_DIR, d, 'SKILL.md');
    return fs.existsSync(skillPath);
  });

  return dirs.map((slug) => parseSkill(slug)).sort((a, b) => a.name.localeCompare(b.name));
}

export function parseSkill(slug: string): Skill {
  const skillPath = path.join(SKILLS_DIR, slug, 'SKILL.md');
  const raw = fs.readFileSync(skillPath, 'utf-8');
  const { data, content } = matter(raw);

  let readme: string | null = null;
  const readmePath = path.join(SKILLS_DIR, slug, 'README.md');
  if (fs.existsSync(readmePath)) {
    readme = fs.readFileSync(readmePath, 'utf-8');
  }

  const references: { filename: string; content: string }[] = [];
  const refsDir = path.join(SKILLS_DIR, slug, 'references');
  if (fs.existsSync(refsDir)) {
    const files = fs.readdirSync(refsDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      references.push({
        filename: file,
        content: fs.readFileSync(path.join(refsDir, file), 'utf-8'),
      });
    }
  }

  return {
    slug,
    name: data.name || slug,
    version: data.version || '0.1.0',
    description: data.description || '',
    category: data.category || 'uncategorized',
    tags: data.tags || [],
    recommended_skills: data.recommended_skills || [],
    platforms: data.platforms || [],
    license: data.license || 'MIT',
    maintainers: data.maintainers || [],
    body: content,
    readme,
    references,
  };
}

export function getSkillsByCategory(skills: Skill[]): Record<string, Skill[]> {
  const grouped: Record<string, Skill[]> = {};
  for (const skill of skills) {
    if (!grouped[skill.category]) {
      grouped[skill.category] = [];
    }
    grouped[skill.category].push(skill);
  }
  return grouped;
}

export function getCategories(skills: Skill[]): string[] {
  return [...new Set(skills.map((s) => s.category))].sort();
}
