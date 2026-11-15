import type { Incident } from '../types';

export interface VerificationBadge {
  label: string;
  tier: 'primary' | 'advisory' | 'curated';
}

export function getVerificationBadge(incident: Incident): VerificationBadge {
  const src = (incident.sourceLabel ?? 'Curated').toLowerCase();
  const hasPrimaryUrl = (incident.sources ?? []).some((u) =>
    /postmortem|status\.|cloudflare|github\.blog|aws\.amazon|cloud\.google|nist\.gov|cisa\.gov|microsoft\.com/i.test(
      u,
    ),
  );

  if (src.includes('cisa') || incident.cveOrRef?.startsWith('CVE-')) {
    return { label: 'Official Advisory / CVE', tier: 'advisory' };
  }
  if (hasPrimaryUrl || src.includes('statuspage') || src.includes('gcp') || src.includes('postmortem')) {
    return { label: 'Primary Postmortem / Status', tier: 'primary' };
  }
  return { label: 'Curated Archive Record', tier: 'curated' };
}

export function buildMarkdownCitation(incident: Incident, url: string): string {
  const ref = incident.cveOrRef ? ` (${incident.cveOrRef})` : '';
  return `[${incident.title}${ref}](${url}) — ${incident.date}. Impact: ${incident.impact}. *Chronicle of Crashes (1998–2026)*.`;
}
