import fs from 'node:fs/promises';
import path from 'node:path';

const OUT_PATH = path.resolve('src/data/outages.json');

const STATUSPAGE_PROVIDERS = [
  { name: 'Cloudflare', sector: 'Cloud & Edge Networking', url: 'https://www.cloudflarestatus.com/api/v2/incidents.json' },
  { name: 'GitHub', sector: 'Developer Infrastructure', url: 'https://www.githubstatus.com/api/v2/incidents.json' },
  { name: 'Discord', sector: 'Communications', url: 'https://discordstatus.com/api/v2/incidents.json' },
  { name: 'Reddit', sector: 'Social Media', url: 'https://www.redditstatus.com/api/v2/incidents.json' },
  { name: 'Vercel', sector: 'Cloud & Hosting', url: 'https://www.vercel-status.com/api/v2/incidents.json' },
  { name: 'OpenAI', sector: 'AI Infrastructure', url: 'https://status.openai.com/api/v2/incidents.json' },
];

const GCP_URL = 'https://status.cloud.google.com/incidents.json';
const DANLUU_URL = 'https://raw.githubusercontent.com/danluu/post-mortems/master/README.md';

function mapStatuspageImpact(impact) {
  if (impact === 'critical') return 'critical';
  if (impact === 'major') return 'major';
  return 'notable';
}

async function fetchStatuspageProvider(provider) {
  try {
    const res = await fetch(provider.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const incidents = Array.isArray(data.incidents) ? data.incidents : [];

    return incidents
      .map((inc) => {
        const iso = inc.created_at || inc.started_at || '';
        const year = Number(iso.slice(0, 4));
        if (!Number.isFinite(year) || year < 1998 || year > 2026) return null;

        const updates = Array.isArray(inc.incident_updates) ? inc.incident_updates : [];
        const latestBody = updates[0]?.body || inc.name;
        const components = Array.isArray(inc.components)
          ? inc.components.map((c) => c.name).filter(Boolean).join(', ')
          : '';

        return {
          id: `sp-${provider.name.toLowerCase()}-${inc.id}`,
          year,
          date: iso.slice(0, 10),
          title: `${provider.name}: ${inc.name}`,
          type: 'crash',
          severity: mapStatuspageImpact(inc.impact),
          sector: provider.sector,
          affected: components ? `${provider.name} (${components})` : provider.name,
          vectorOrCause: `Service incident (${inc.impact || 'minor'} impact, status: ${inc.status || 'resolved'})`,
          impact: inc.resolved_at
            ? `Resolved ${inc.resolved_at.slice(0, 10)}`
            : `Status: ${inc.status || 'reported'}`,
          summary: latestBody,
          postmortem: latestBody,
          sourceLabel: 'Statuspage',
          sources: inc.shortlink ? [inc.shortlink] : [],
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.warn(`Skipping ${provider.name} (${err.message})`);
    return [];
  }
}

async function fetchGoogleCloud() {
  try {
    const res = await fetch(GCP_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const incidents = await res.json();
    if (!Array.isArray(incidents)) return [];

    return incidents
      .map((inc) => {
        const iso = inc.begin || inc.created || '';
        const year = Number(iso.slice(0, 4));
        if (!Number.isFinite(year) || year < 1998 || year > 2026) return null;

        const service = inc.service_name || 'Google Cloud';
        const severity =
          inc.severity === 'high' ? 'critical' : inc.severity === 'medium' ? 'major' : 'notable';
        const desc =
          inc.most_recent_update?.text ||
          inc.external_desc ||
          `${service} service disruption`;

        return {
          id: `gcp-${inc.id}`,
          year,
          date: iso.slice(0, 10),
          title: `Google Cloud (${service}): ${inc.external_desc || 'Service Incident'}`,
          type: 'crash',
          severity,
          sector: 'Cloud Infrastructure',
          affected: `Google Cloud — ${service}`,
          vectorOrCause: `${service} operational incident (severity: ${inc.severity || 'unknown'})`,
          impact: inc.end ? `Ended ${inc.end.slice(0, 10)}` : 'Reported outage',
          summary: desc,
          postmortem: desc,
          sourceLabel: 'GCP Status',
          sources: inc.uri ? [`https://status.cloud.google.com/${inc.uri.replace(/^\//, '')}`] : [],
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.warn(`Skipping Google Cloud (${err.message})`);
    return [];
  }
}

async function fetchDanluuPostmortems() {
  try {
    const res = await fetch(DANLUU_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();
    const lines = md.split('\n');
    const results = [];
    let currentCategory = 'Software & Infrastructure';

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx].trim();
      if (line.startsWith('## ')) {
        currentCategory = line.replace(/^##\s+/, '').trim();
        if (/other lists of postmortems|analysis|contributors/i.test(currentCategory)) {
          break;
        }
        continue;
      }

      if (!line.startsWith('[')) continue;

      const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)\.\s*(.+)$/.exec(line);
      if (!linkMatch) continue;

      const [, company, url, body] = linkMatch;
      // Prefer year in text, fallback to year in URL (ignoring web.archive.org/web/YYYY... prefix)
      const cleanUrl = url.replace(/https?:\/\/web\.archive\.org\/web\/\d+\//, '');
      const yearMatch =
        /\b(199[89]|20[0-2]\d)\b/.exec(body) || /\b(199[89]|20[0-2]\d)\b/.exec(cleanUrl);
      if (!yearMatch) continue;

      const year = Number(yearMatch[1]);
      if (year < 1998 || year > 2026) continue;

      const shortTitle = body.split(/\.(\s|$)/)[0].slice(0, 90).trim();
      results.push({
        id: `danluu-${year}-${idx}`,
        year,
        date: String(year),
        title: `${company}: ${shortTitle}${shortTitle.length >= 90 ? '…' : ''}`,
        type: 'crash',
        severity: 'major',
        sector: currentCategory,
        affected: company,
        vectorOrCause: `Engineering postmortem (${currentCategory})`,
        impact: 'Publicly documented software/infrastructure outage',
        summary: body,
        postmortem: body,
        sourceLabel: 'Postmortems',
        sources: [url],
      });
    }

    return results;
  } catch (err) {
    console.warn(`Skipping danluu/post-mortems (${err.message})`);
    return [];
  }
}

async function main() {
  let existing = [];
  try {
    existing = JSON.parse(await fs.readFile(OUT_PATH, 'utf8'));
    if (!Array.isArray(existing)) existing = [];
  } catch {
    existing = [];
  }

  console.log('Syncing Statuspage endpoints, Google Cloud Status, and danluu/post-mortems...');
  const [spLists, gcpList, danluuList] = await Promise.all([
    Promise.all(STATUSPAGE_PROVIDERS.map(fetchStatuspageProvider)),
    fetchGoogleCloud(),
    fetchDanluuPostmortems(),
  ]);

  const incoming = [...spLists.flat(), ...gcpList, ...danluuList];

  // Merge incrementally by id so historical Statuspage entries accumulate across runs
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) {
    byId.set(item.id, item);
  }

  const merged = Array.from(byId.values());
  await fs.writeFile(OUT_PATH, JSON.stringify(merged, null, 2), 'utf8');

  console.log(
    `Saved ${merged.length} outage/postmortem entries (Statuspage: ${spLists.flat().length}, GCP: ${gcpList.length}, Postmortems: ${danluuList.length})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
