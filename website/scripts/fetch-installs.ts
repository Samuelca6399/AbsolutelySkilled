import fs from 'node:fs';
import path from 'node:path';

const SKILLS_DIR = path.resolve(process.cwd(), '../skills');
const OUTPUT_FILE = path.resolve(process.cwd(), 'src/data/installs.json');

async function fetchInstalls() {
  const slugs = fs.readdirSync(SKILLS_DIR).filter((d) => {
    return fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md'));
  });

  const installs: Record<string, number | string> = {};
  let total = 0;

  console.log(`Fetching install counts for ${slugs.length} skills...`);

  for (const slug of slugs) {
    try {
      const res = await fetch(
        `https://skills.sh/api/search?q=${encodeURIComponent(slug)}&limit=100`
      );

      if (!res.ok) {
        console.warn(`Failed to fetch installs for ${slug}: ${res.status}`);
        continue;
      }

      const data = await res.json();
      const match = data?.results?.find(
        (r: { id: string }) => r.id === `absolutelyskilled/absolutelyskilled/${slug}`
      );

      if (match?.installs) {
        installs[slug] = match.installs;
        total += match.installs;
      }
    } catch (err) {
      console.warn(`Error fetching installs for ${slug}:`, err);
    }
  }

  installs._total = total;
  installs._fetchedAt = new Date().toISOString();

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(installs, null, 2) + '\n');
  console.log(`Wrote install counts for ${Object.keys(installs).length - 2} skills (total: ${total})`);
}

fetchInstalls().catch(console.error);
