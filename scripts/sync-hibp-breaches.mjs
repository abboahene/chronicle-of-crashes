import fs from 'node:fs/promises';
import path from 'node:path';

const HIBP_BREACHES_URL = 'https://haveibeenpwned.com/api/v3/breaches';
const OUT_PATH = path.resolve('src/data/hibp-breaches.json');

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

async function main() {
  console.log('Fetching Have I Been Pwned verified breaches...');
  const res = await fetch(HIBP_BREACHES_URL, {
    headers: {
      'User-Agent': 'ChronicleOfCrashes/1.0 (https://github.com/chronicle-of-crashes)',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch HIBP breaches: ${res.status} ${res.statusText}`);
  }

  const breaches = await res.json();
  if (!Array.isArray(breaches)) {
    throw new Error('Unexpected HIBP response format');
  }

  const mapped = breaches
    .map((b) => {
      if (!b.IsVerified) return null;
      const dateStr = b.BreachDate || '';
      const year = Number(dateStr.slice(0, 4));
      if (!Number.isFinite(year) || year < 1998 || year > 2026) return null;

      const count = Number(b.PwnCount) || 0;
      const severity =
        count >= 10_000_000 ? 'critical' : count >= 500_000 ? 'major' : 'notable';
      const dataClasses = Array.isArray(b.DataClasses) ? b.DataClasses.join(', ') : 'User data';
      const desc = stripHtml(b.Description);

      return {
        id: `hibp-${String(b.Name || '').toLowerCase()}`,
        year,
        date: dateStr,
        title: `${b.Title || b.Name} Data Breach`,
        type: 'cyberattack',
        severity,
        sector: b.Domain || 'Online Service',
        affected: `${b.Title || b.Name}${b.Domain ? ` (${b.Domain})` : ''}`,
        vectorOrCause: `Exposed data classes: ${dataClasses}`,
        impact: `${count.toLocaleString('en-US')} compromised accounts`,
        summary: desc,
        postmortem: `${desc} (Breach date: ${b.BreachDate}; added to HIBP: ${b.AddedDate?.slice(0, 10) || 'N/A'}).`,
        sourceLabel: 'HIBP',
        sources: [`https://haveibeenpwned.com/PwnedWebsites#${b.Name}`],
      };
    })
    .filter(Boolean);

  await fs.writeFile(OUT_PATH, JSON.stringify(mapped, null, 2), 'utf8');
  console.log(`Saved ${mapped.length} HIBP verified breaches (1998–2026) to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

