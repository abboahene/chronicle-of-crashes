import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function loadJson(relPath) {
  try {
    return JSON.parse(readFileSync(resolve(root, relPath), 'utf8'));
  } catch {
    return [];
  }
}

function escapeXml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

const outages = loadJson('src/data/outages.json');
const kev = loadJson('src/data/cisa-kev.json');
const hibp = loadJson('src/data/hibp-breaches.json');

const combined = [...outages, ...kev, ...hibp]
  .filter((i) => i && i.id && i.title && i.year)
  .sort((a, b) => b.year - a.year)
  .slice(0, 30);

const siteUrl = 'https://benefo.dev/chronicle-of-crashes';

const itemsXml = combined
  .map((item) => {
    const link = `${siteUrl}/?incident=${encodeURIComponent(item.id)}`;
    return `    <item>
      <title>${escapeXml(`[${item.date}] ${item.title}`)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(item.id)}</guid>
      <category>${escapeXml(item.type)}</category>
      <description>${escapeXml(`${item.impact} — ${item.summary}`)}</description>
    </item>`;
  })
  .join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Chronicle of Crashes (1998–2026)</title>
    <link>${siteUrl}/</link>
    <description>Latest synced software crashes, cloud outages, and cyberattacks from Chronicle of Crashes.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>
`;

writeFileSync(resolve(root, 'public/feed.xml'), rss, 'utf8');
console.log(`Generated public/feed.xml with ${combined.length} items.`);
