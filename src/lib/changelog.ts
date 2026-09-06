import raw from '../../CHANGELOG.md?raw';

export interface ChangelogSection {
  heading: string;
  bullets: string[];
}

/** Parse the bundled CHANGELOG.md into `## heading` sections with `- ` bullets. */
export function parseChangelog(text: string = raw): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  let cur: ChangelogSection | null = null;

  for (const line of text.split('\n')) {
    const h = line.match(/^##\s+(.*\S)\s*$/);
    if (h) {
      cur = { heading: h[1], bullets: [] };
      sections.push(cur);
      continue;
    }
    if (!cur) continue;
    const b = line.match(/^\s*[-*]\s+(.*\S)\s*$/);
    if (b) {
      cur.bullets.push(b[1]);
    } else if (line.trim() && cur.bullets.length) {
      // wrapped continuation line
      cur.bullets[cur.bullets.length - 1] += ' ' + line.trim();
    }
  }
  return sections.filter((s) => s.bullets.length > 0);
}

export const CHANGELOG = parseChangelog();
