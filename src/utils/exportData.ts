import type { Incident } from '../types';

function escapeCsv(value: string | number | undefined): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportIncidentsAsJson(incidents: Incident[]) {
  const payload = JSON.stringify(incidents, null, 2);
  triggerDownload(payload, 'chronicle-of-crashes.json', 'application/json;charset=utf-8');
}

export function exportIncidentsAsCsv(incidents: Incident[]) {
  const headers = [
    'id',
    'year',
    'date',
    'title',
    'type',
    'severity',
    'sourceLabel',
    'sector',
    'affected',
    'vectorOrCause',
    'impact',
    'cveOrRef',
    'summary',
    'sources',
  ];

  const rows = incidents.map((item) =>
    [
      item.id,
      item.year,
      item.date,
      item.title,
      item.type,
      item.severity,
      item.sourceLabel ?? 'Curated',
      item.sector,
      item.affected,
      item.vectorOrCause,
      item.impact,
      item.cveOrRef ?? '',
      item.summary,
      (item.sources ?? []).join(' | '),
    ]
      .map(escapeCsv)
      .join(','),
  );

  const csv = [headers.join(','), ...rows].join('\n');
  triggerDownload(csv, 'chronicle-of-crashes.csv', 'text/csv;charset=utf-8');
}

