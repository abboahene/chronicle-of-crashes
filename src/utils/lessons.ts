import type { Incident } from '../types';

const LESSON_RULES: { label: string; pattern: RegExp }[] = [
  {
    label: 'Staged Rollouts & Canarying',
    pattern: /\b(rollout|deploy|update|feature file|channel file|config|regex|typo|flag)\b/i,
  },
  {
    label: 'BGP / DNS Validation',
    pattern: /\b(bgp|dns|route\s*53|routing|prefix|nameserver|servfail)\b/i,
  },
  {
    label: 'Phishing-Resistant MFA',
    pattern: /\b(mfa|vishing|spear-phishing|credential|password|vpn|citrix|okta|social engineering)\b/i,
  },
  {
    label: 'Immutable Backups & Segmentation',
    pattern: /\b(ransomware|wiper|lateral movement|flat network|backup|active directory)\b/i,
  },
  {
    label: 'Supply-Chain & Build Integrity',
    pattern: /\b(supply[- ]chain|solarwinds|xz utils|magecart|sri|third-party|dependency|litellm)\b/i,
  },
  {
    label: 'Patch & Asset Hygiene',
    pattern: /\b(unpatched|zero-day|cve-|rce|sql injection|buffer overflow|struts|log4j|eternalblue)\b/i,
  },
  {
    label: 'Bounds, Units & Race-Condition Checks',
    pattern: /\b(race condition|overflow|unit mismatch|bounds|livelock|leap second|checksum)\b/i,
  },
  {
    label: 'Multi-Region Redundancy',
    pattern: /\b(us-east-1|single region|failover|backup power|control plane|monoculture)\b/i,
  },
];

export function deriveLessons(incident: Incident): string[] {
  const haystack = `${incident.title} ${incident.vectorOrCause} ${incident.summary} ${incident.postmortem}`;
  const matched = LESSON_RULES.filter((r) => r.pattern.test(haystack)).map((r) => r.label);
  if (matched.length === 0) {
    return [
      incident.type === 'crash' ? 'Automated Safety & Rollback Guards' : 'Defense-in-Depth & Monitoring',
    ];
  }
  return matched.slice(0, 4);
}

