import fs from 'node:fs/promises';
import path from 'node:path';

const CISA_KEV_URL =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const OUT_PATH = path.resolve('src/data/cisa-kev.json');

async function main() {
  console.log('Fetching CISA Known Exploited Vulnerabilities catalog...');
  const res = await fetch(CISA_KEV_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch CISA KEV: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const vulns = Array.isArray(data.vulnerabilities) ? data.vulnerabilities : [];

  const mapped = vulns
    .map((v) => {
      const dateStr = v.dateAdded || '';
      const cveYearMatch = /^CVE-(\d{4})-/i.exec(v.cveID || '');
      const year = cveYearMatch ? Number(cveYearMatch[1]) : Number(dateStr.slice(0, 4));
      if (!Number.isFinite(year) || year < 1998 || year > 2026) return null;

      const isRansomware = v.knownRansomwareCampaignUse === 'Known';
      return {
        id: `kev-${v.cveID.toLowerCase()}`,
        year,
        date: `${year} (KEV added ${dateStr})`,
        title: `${v.vendorProject} ${v.product} — ${v.vulnerabilityName}`,
        type: 'cyberattack',
        severity: isRansomware ? 'critical' : 'major',
        sector: v.vendorProject || 'Enterprise Software',
        affected: `${v.vendorProject} ${v.product}`.trim(),
        vectorOrCause: v.shortDescription || v.vulnerabilityName,
        impact: isRansomware
          ? 'Actively exploited in the wild (Known Ransomware Campaign Use)'
          : 'Actively exploited in the wild (CISA KEV)',
        summary: v.shortDescription || v.vulnerabilityName,
        postmortem: `${v.requiredAction || 'Apply vendor mitigations or patches.'}${
          v.notes ? ` Notes: ${v.notes}` : ''
        }`,
        cveOrRef: v.cveID,
        sourceLabel: 'CISA KEV',
        sources: [`https://nvd.nist.gov/vuln/detail/${v.cveID}`],
      };
    })
    .filter(Boolean);

  await fs.writeFile(OUT_PATH, JSON.stringify(mapped, null, 2), 'utf8');
  console.log(`Saved ${mapped.length} CISA KEV entries (1998–2026) to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

