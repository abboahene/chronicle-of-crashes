export type IncidentType = 'crash' | 'cyberattack';

export type Severity = 'critical' | 'major' | 'notable';

export interface Incident {
  id: string;
  year: number;
  date: string; // e.g., "Jul 19, 2024" or "May 2000"
  title: string;
  type: IncidentType;
  severity: Severity;
  sector: string;
  affected: string;
  vectorOrCause: string;
  impact: string;
  summary: string;
  postmortem: string;
  cveOrRef?: string;
  sources?: string[];
  sourceLabel?: string;
}

export interface YearMeta {
  year: number;
  eraTitle: string;
  eraNote: string;
}

export interface EraRange {
  start: number;
  end: number;
  label: string;
}

