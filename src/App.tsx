import { useEffect, useMemo, useRef, useState } from 'react';
import { INCIDENTS } from './data/incidents';
import { YEAR_META } from './data/years';
import type { EraRange, Incident, IncidentType, Severity } from './types';
import { IncidentModal } from './components/IncidentModal';
import { YearlyChart } from './components/YearlyChart';
import { EraStoryModal } from './components/EraStoryModal';
import { exportIncidentsAsCsv, exportIncidentsAsJson } from './utils/exportData';

type TypeFilter = 'all' | IncidentType;
type SeverityFilter = 'all' | Severity;
type SourceFilter =
  | 'all'
  | 'Curated'
  | 'CISA KEV'
  | 'HIBP'
  | 'Statuspage'
  | 'GCP Status'
  | 'Postmortems';
type PatternFilter =
  | 'all'
  | 'bgp-dns'
  | 'ransomware'
  | 'supply-chain'
  | 'config-bug'
  | 'cloud'
  | 'aviation';
type SortOrder = 'asc' | 'desc';

const PATTERN_MATCHERS: Record<Exclude<PatternFilter, 'all'>, RegExp> = {
  'bgp-dns': /\b(bgp|dns|route\s*53|routing|nameserver|servfail)\b/i,
  ransomware: /\b(ransomware|wannacry|notpetya|conti|lockbit|alphv|blackcat|cl0p|darkside)\b/i,
  'supply-chain': /\b(supply[- ]chain|solarwinds|xz utils|log4j|log4shell|magecart|npm|litellm)\b/i,
  'config-bug': /\b(config|typo|regex|race condition|misconfig|bug|overflow|livelock|permission)\b/i,
  cloud: /\b(aws|s3|ec2|dynamodb|azure|google cloud|gcp|cloudflare|fastly|microsoft 365)\b/i,
  aviation: /\b(aviation|airline|flight|faa|notam|airport|delta|comair)\b/i,
};

const YEAR_PREVIEW_LIMIT = 6;

const LANDMARK_HIGHLIGHTS = [
  { id: '2017-notpetya', year: 2017, name: 'NotPetya', stat: '$10B+', unit: 'damages', kind: 'cyber' },
  { id: '2024-crowdstrike-bsod', year: 2024, name: 'CrowdStrike', stat: '8.5M', unit: 'hosts', kind: 'crash' },
  { id: '2025-aws-us-east-1-dynamodb', year: 2025, name: 'AWS US-East-1', stat: '17M+', unit: 'reports', kind: 'crash' },
  { id: '2026-microsoft-365-outage', year: 2026, name: 'Microsoft 365', stat: '7.4M+', unit: 'reports', kind: 'crash' },
  { id: '2013-yahoo-breach', year: 2013, name: 'Yahoo Breach', stat: '3B', unit: 'accounts', kind: 'cyber' },
  { id: '2021-log4shell', year: 2021, name: 'Log4Shell', stat: '10.0', unit: 'CVSS score', kind: 'cyber' },
] as const;

const CURATED_WITH_LABEL: Incident[] = INCIDENTS.map((i) => ({
  ...i,
  sourceLabel: i.sourceLabel ?? 'Curated',
}));

function readInitialParams() {
  const params = new URLSearchParams(window.location.search);
  const yearParam = params.get('year');
  const parsedYear = yearParam ? Number(yearParam) : null;
  return {
    search: params.get('q') ?? '',
    typeFilter: (params.get('type') as TypeFilter) || 'all',
    severityFilter: (params.get('severity') as SeverityFilter) || 'all',
    sourceFilter: (params.get('source') as SourceFilter) || 'all',
    patternFilter: (params.get('pattern') as PatternFilter) || 'all',
    selectedYear:
      parsedYear && parsedYear >= 1998 && parsedYear <= 2026 ? parsedYear : null,
    sortOrder: (params.get('sort') === 'desc' ? 'desc' : 'asc') as SortOrder,
    activeIncidentId: params.get('incident') || null,
  };
}

function matchesPattern(item: Incident, pattern: PatternFilter): boolean {
  if (pattern === 'all') return true;
  const re = PATTERN_MATCHERS[pattern];
  return (
    re.test(item.title) ||
    re.test(item.sector) ||
    re.test(item.vectorOrCause) ||
    re.test(item.summary) ||
    re.test(item.postmortem)
  );
}

function matchesSearch(item: Incident, q: string): boolean {
  if (!q) return true;
  return (
    item.title.toLowerCase().includes(q) ||
    item.summary.toLowerCase().includes(q) ||
    item.postmortem.toLowerCase().includes(q) ||
    item.sector.toLowerCase().includes(q) ||
    item.affected.toLowerCase().includes(q) ||
    item.vectorOrCause.toLowerCase().includes(q) ||
    String(item.year).includes(q) ||
    (item.cveOrRef?.toLowerCase().includes(q) ?? false)
  );
}

export function App() {
  const initial = useMemo(() => readInitialParams(), []);
  const [search, setSearch] = useState(initial.search);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initial.typeFilter);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>(initial.severityFilter);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(initial.sourceFilter);
  const [patternFilter, setPatternFilter] = useState<PatternFilter>(initial.patternFilter);
  const [selectedYear, setSelectedYear] = useState<number | null>(initial.selectedYear);
  const [eraFilter, setEraFilter] = useState<EraRange | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initial.sortOrder);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(
    initial.activeIncidentId,
  );
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => new Set());
  const [externalIncidents, setExternalIncidents] = useState<Incident[]>([]);
  const [feedsLoading, setFeedsLoading] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Press '/' anywhere (outside inputs/modals) to jump to search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (activeIncidentId || storyOpen) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIncidentId, storyOpen]);

  // Lazy-load large external JSON feeds so initial bundle stays small & fast
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('./data/cisa-kev.json'),
      import('./data/hibp-breaches.json'),
      import('./data/outages.json'),
    ])
      .then(([kevMod, hibpMod, outagesMod]) => {
        if (cancelled) return;
        const curatedCves = new Set(
          INCIDENTS.map((i) => i.cveOrRef?.match(/CVE-\d{4}-\d+/i)?.[0]?.toUpperCase()).filter(
            Boolean,
          ),
        );
        const kevItems = (kevMod.default as Incident[]).filter(
          (k) => !k.cveOrRef || !curatedCves.has(k.cveOrRef.toUpperCase()),
        );
        const hibpItems = hibpMod.default as Incident[];
        const outageItems = outagesMod.default as Incident[];
        setExternalIncidents([...kevItems, ...hibpItems, ...outageItems]);
        setFeedsLoading(false);
      })
      .catch(() => {
        if (!cancelled) setFeedsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync filters & active incident to URL query parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (severityFilter !== 'all') params.set('severity', severityFilter);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    if (patternFilter !== 'all') params.set('pattern', patternFilter);
    if (selectedYear !== null) params.set('year', String(selectedYear));
    if (sortOrder !== 'asc') params.set('sort', sortOrder);
    if (activeIncidentId) params.set('incident', activeIncidentId);

    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
  }, [
    search,
    typeFilter,
    severityFilter,
    sourceFilter,
    patternFilter,
    selectedYear,
    sortOrder,
    activeIncidentId,
  ]);

  // Show Back to Top button when scrolled down
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const allIncidents = useMemo(
    () => [...CURATED_WITH_LABEL, ...externalIncidents],
    [externalIncidents],
  );

  const filteredIncidents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allIncidents.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (sourceFilter !== 'all' && item.sourceLabel !== sourceFilter) return false;
      if (!matchesPattern(item, patternFilter)) return false;
      if (eraFilter && (item.year < eraFilter.start || item.year > eraFilter.end)) return false;
      if (selectedYear !== null && item.year !== selectedYear) return false;
      return matchesSearch(item, q);
    });
  }, [
    allIncidents,
    search,
    typeFilter,
    severityFilter,
    sourceFilter,
    patternFilter,
    eraFilter,
    selectedYear,
  ]);

  const groupedByYear = useMemo(() => {
    const map = new Map<number, Incident[]>();
    for (const item of filteredIncidents) {
      const list = map.get(item.year) ?? [];
      list.push(item);
      map.set(item.year, list);
    }

    const years = YEAR_META.filter((ym) => {
      if (selectedYear !== null && ym.year !== selectedYear) return false;
      return map.has(ym.year);
    });

    if (sortOrder === 'desc') {
      years.reverse();
    }

    return years.map((meta) => ({
      meta,
      incidents: map.get(meta.year) ?? [],
    }));
  }, [filteredIncidents, selectedYear, sortOrder]);

  const orderedFiltered = useMemo(
    () => groupedByYear.flatMap((g) => g.incidents),
    [groupedByYear],
  );

  const activeIndex = useMemo(
    () => (activeIncidentId ? orderedFiltered.findIndex((i) => i.id === activeIncidentId) : -1),
    [activeIncidentId, orderedFiltered],
  );
  const activeIncident =
    activeIndex >= 0
      ? orderedFiltered[activeIndex]
      : activeIncidentId
        ? (allIncidents.find((i) => i.id === activeIncidentId) ?? null)
        : null;

  const yearStripData = useMemo(() => {
    const q = search.trim().toLowerCase();
    return YEAR_META.map((meta) => {
      const items = allIncidents.filter((item) => {
        if (item.year !== meta.year) return false;
        if (typeFilter !== 'all' && item.type !== typeFilter) return false;
        if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
        if (sourceFilter !== 'all' && item.sourceLabel !== sourceFilter) return false;
        if (!matchesPattern(item, patternFilter)) return false;
        return matchesSearch(item, q);
      });
      return { year: meta.year, items };
    });
  }, [allIncidents, search, typeFilter, severityFilter, sourceFilter, patternFilter]);

  const crashCount = filteredIncidents.filter((i) => i.type === 'crash').length;
  const cyberCount = filteredIncidents.filter((i) => i.type === 'cyberattack').length;

  const hasActiveFilters = Boolean(
    search ||
      typeFilter !== 'all' ||
      severityFilter !== 'all' ||
      sourceFilter !== 'all' ||
      patternFilter !== 'all' ||
      eraFilter !== null ||
      selectedYear !== null,
  );

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setSeverityFilter('all');
    setSourceFilter('all');
    setPatternFilter('all');
    setEraFilter(null);
    setSelectedYear(null);
    setExpandedYears(new Set());
  };

  const toggleYearExpanded = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-brand">
          <span className="eyebrow">Digital Incident Archive • 1998 – 2026</span>
          <h1 className="site-title">Chronicle of Crashes</h1>
          <p className="site-subtitle">
            A year-by-year ledger of landmark software bugs, cloud outages, and cyberattacks across
            29 years of computing history.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="export-btn"
            onClick={() => {
              const pool = filteredIncidents.length > 0 ? filteredIncidents : allIncidents;
              if (pool.length === 0) return;
              const pick = pool[Math.floor(Math.random() * pool.length)];
              setActiveIncidentId(pick.id);
            }}
            title="Open a random incident from the current view"
          >
            🎲 Random
          </button>
          <button
            type="button"
            className="story-launch-btn"
            onClick={() => setStoryOpen(true)}
          >
            <span aria-hidden="true">▶</span>
            <span>See how failures evolved (1998–2026)</span>
          </button>
        </div>
      </header>

      <section className="stats-bar" aria-label="Archive summary statistics">
        <div className="stat-card">
          <span className="stat-label">Incidents Shown</span>
          <span className="stat-value">{filteredIncidents.length.toLocaleString('en-US')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Software Crashes</span>
          <span className="stat-value crash">{crashCount.toLocaleString('en-US')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Cyberattacks</span>
          <span className="stat-value cyber">{cyberCount.toLocaleString('en-US')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Years Covered</span>
          <span className="stat-value">{groupedByYear.length} / 29</span>
        </div>
      </section>

      <YearlyChart
        data={yearStripData}
        selectedYear={selectedYear}
        onSelectYear={(year) => setSelectedYear((prev) => (prev === year ? null : year))}
        onClearYear={() => setSelectedYear(null)}
      />

      <section className="insights-section" aria-label="Top impact incidents">
        <div className="insights-header">
          <span className="year-strip-title">
            Top Impact Incidents (Click to inspect postmortem)
          </span>
        </div>

        <div className="impact-grid" role="group" aria-label="Top impact landmark incidents">
          {LANDMARK_HIGHLIGHTS.map((h) => (
            <button
              key={h.id}
              type="button"
              className={`impact-card impact-card--${h.kind}`}
              onClick={() => setActiveIncidentId(h.id)}
            >
              <div className="impact-card-top">
                <span className="impact-card-year">{h.year}</span>
                <span className="impact-card-arrow" aria-hidden="true">↗</span>
              </div>
              <div className="impact-card-metric">
                <span className="impact-card-stat">{h.stat}</span>
                <span className="impact-card-unit">{h.unit}</span>
              </div>
              <span className="impact-card-name">{h.name}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="controls-bar" role="search">
        <div className="controls-top-row">
          <div className="search-wrap">
            <input
              ref={searchInputRef}
              type="search"
              className="search-input"
              placeholder="Search incidents, CVEs, root causes, sectors, or years... (Press /)"
              aria-label="Search incidents"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="controls-actions">
            {hasActiveFilters && (
              <button type="button" className="reset-btn" onClick={resetFilters}>
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="controls-filters-row">
          <div className="filter-section">
            <span className="filter-label" id="filter-type-label">
              Type
            </span>
            <div className="segmented-group" role="group" aria-labelledby="filter-type-label">
              <button
                type="button"
                className="filter-btn"
                aria-pressed={typeFilter === 'all'}
                onClick={() => setTypeFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className="filter-btn crash"
                aria-pressed={typeFilter === 'crash'}
                onClick={() => setTypeFilter('crash')}
              >
                Software Crashes
              </button>
              <button
                type="button"
                className="filter-btn cyber"
                aria-pressed={typeFilter === 'cyberattack'}
                onClick={() => setTypeFilter('cyberattack')}
              >
                Cyberattacks
              </button>
            </div>
          </div>

          <div className="filter-section">
            <span className="filter-label" id="filter-severity-label">
              Severity
            </span>
            <div className="segmented-group" role="group" aria-labelledby="filter-severity-label">
              <button
                type="button"
                className="filter-btn"
                aria-pressed={severityFilter === 'all'}
                onClick={() => setSeverityFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className="filter-btn"
                aria-pressed={severityFilter === 'critical'}
                onClick={() => setSeverityFilter('critical')}
              >
                Critical
              </button>
              <button
                type="button"
                className="filter-btn"
                aria-pressed={severityFilter === 'major'}
                onClick={() => setSeverityFilter('major')}
              >
                Major
              </button>
            </div>
          </div>

          <div className="filter-section">
            <span className="filter-label" id="filter-pattern-label">
              Pattern / Sector
            </span>
            <div className="segmented-group" role="group" aria-labelledby="filter-pattern-label">
              {(
                [
                  ['all', 'All'],
                  ['bgp-dns', 'BGP / DNS'],
                  ['ransomware', 'Ransomware'],
                  ['supply-chain', 'Supply Chain'],
                  ['config-bug', 'Config / Bug'],
                  ['cloud', 'Cloud'],
                  ['aviation', 'Aviation'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className="filter-btn"
                  aria-pressed={patternFilter === key}
                  onClick={() => setPatternFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <span className="filter-label" id="filter-source-label">
              Source
            </span>
            <div className="segmented-group" role="group" aria-labelledby="filter-source-label">
              {(
                ['all', 'Curated', 'CISA KEV', 'HIBP', 'Statuspage', 'GCP Status', 'Postmortems'] as const
              ).map((src) => (
                <button
                  key={src}
                  type="button"
                  className="filter-btn"
                  aria-pressed={sourceFilter === src}
                  onClick={() => setSourceFilter(src)}
                >
                  {src === 'all' ? 'All' : src}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main>
        {groupedByYear.length > 0 && (
          <div className="timeline-toolbar">
            <div className="toolbar-left">
              <span className="timeline-count">
                Showing {filteredIncidents.length.toLocaleString('en-US')} incident
                {filteredIncidents.length === 1 ? '' : 's'} across {groupedByYear.length} year
                {groupedByYear.length === 1 ? '' : 's'}
                {feedsLoading ? ' (loading live feeds...)' : ''}
              </span>
              {hasActiveFilters && (
                <div className="active-filters-bar" role="group" aria-label="Active filters">
                  {eraFilter && (
                    <button
                      type="button"
                      className="active-filter-chip"
                      onClick={() => setEraFilter(null)}
                      title="Clear era filter"
                    >
                      <span>Era: {eraFilter.label}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                  {selectedYear !== null && (
                    <button
                      type="button"
                      className="active-filter-chip"
                      onClick={() => setSelectedYear(null)}
                      title="Clear year filter"
                    >
                      <span>Year: {selectedYear}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                  {search.trim() !== '' && (
                    <button
                      type="button"
                      className="active-filter-chip"
                      onClick={() => setSearch('')}
                      title="Clear search query"
                    >
                      <span>Search: &ldquo;{search.trim()}&rdquo;</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                  {typeFilter !== 'all' && (
                    <button
                      type="button"
                      className="active-filter-chip"
                      onClick={() => setTypeFilter('all')}
                      title="Clear type filter"
                    >
                      <span>Type: {typeFilter}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                  {severityFilter !== 'all' && (
                    <button
                      type="button"
                      className="active-filter-chip"
                      onClick={() => setSeverityFilter('all')}
                      title="Clear severity filter"
                    >
                      <span>Severity: {severityFilter}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                  {sourceFilter !== 'all' && (
                    <button
                      type="button"
                      className="active-filter-chip"
                      onClick={() => setSourceFilter('all')}
                      title="Clear source filter"
                    >
                      <span>Source: {sourceFilter}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                  {patternFilter !== 'all' && (
                    <button
                      type="button"
                      className="active-filter-chip"
                      onClick={() => setPatternFilter('all')}
                      title="Clear pattern filter"
                    >
                      <span>Pattern: {patternFilter}</span>
                      <span aria-hidden="true">×</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="clear-all-link"
                    onClick={resetFilters}
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
            <div className="toolbar-right">
              <button
                type="button"
                className="export-btn"
                onClick={() => exportIncidentsAsCsv(filteredIncidents)}
                title="Download currently filtered incidents as CSV"
              >
                Export CSV
              </button>
              <button
                type="button"
                className="export-btn"
                onClick={() => exportIncidentsAsJson(filteredIncidents)}
                title="Download currently filtered incidents as JSON"
              >
                Export JSON
              </button>
              <button
                type="button"
                className="sort-toggle"
                aria-label="Toggle chronological sort order"
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              >
                <span aria-hidden="true">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                <span>
                  Sort by year:{' '}
                  {sortOrder === 'asc' ? '1998 → 2026 (Oldest first)' : '2026 → 1998 (Newest first)'}
                </span>
              </button>
            </div>
          </div>
        )}

        {groupedByYear.length === 0 ? (
          <div className="empty-state">
            <p>No incidents match your current filters.</p>
            <button type="button" className="filter-btn" onClick={resetFilters}>
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="timeline-list">
            {groupedByYear.map(({ meta, incidents }) => {
              const isExpanded = selectedYear !== null || expandedYears.has(meta.year);
              const visibleIncidents = isExpanded
                ? incidents
                : incidents.slice(0, YEAR_PREVIEW_LIMIT);
              const hiddenCount = incidents.length - visibleIncidents.length;

              return (
                <section
                  key={meta.year}
                  id={`year-${meta.year}`}
                  className="year-section"
                  aria-labelledby={`heading-${meta.year}`}
                >
                  <header className="year-header">
                    <div className="year-heading-group">
                      <h2 id={`heading-${meta.year}`} className="year-number">
                        {meta.year}
                      </h2>
                      <span className="year-era-title">{meta.eraTitle}</span>
                    </div>
                    <p className="year-era-note">{meta.eraNote}</p>
                  </header>

                  <div className="incident-grid">
                    {visibleIncidents.map((incident) => (
                      <button
                        key={incident.id}
                        type="button"
                        className="incident-card"
                        onClick={() => setActiveIncidentId(incident.id)}
                      >
                        <div className="card-meta-row">
                          <div className="badge-group">
                            <span className={`badge ${incident.type}`}>
                              {incident.type === 'crash' ? 'Crash' : 'Cyberattack'}
                            </span>
                            <span className={`badge severity-${incident.severity}`}>
                              {incident.severity}
                            </span>
                            {incident.sourceLabel && (
                              <span className="badge severity-notable">{incident.sourceLabel}</span>
                            )}
                          </div>
                          <span className="card-date">{incident.date}</span>
                        </div>

                        <div className="card-body">
                          <h3 className="card-title">{incident.title}</h3>
                          <p className="card-summary">{incident.summary}</p>
                        </div>

                        <div className="card-footer">
                          <span className="card-impact" title={incident.impact}>
                            {incident.impact}
                          </span>
                          <span className="card-readmore">Postmortem →</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedYear === null && incidents.length > YEAR_PREVIEW_LIMIT && (
                    <div className="year-show-more">
                      <button
                        type="button"
                        className="show-more-btn"
                        onClick={() => toggleYearExpanded(meta.year)}
                      >
                        {isExpanded
                          ? `Show fewer (${meta.year})`
                          : `Show all ${incidents.length} incidents in ${meta.year} (+${hiddenCount} more)`}
                      </button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>

      <footer className="site-footer">
        <span>Chronicle of Crashes • 1998–2026</span>
        <span>
          Missing a major outage or breach?{' '}
          <a
            className="footer-link"
            href="https://github.com/abboahene/chronicle-of-crashes/issues/new?template=suggest-incident.yml"
            target="_blank"
            rel="noreferrer"
            title="Submit a new incident via GitHub Issues"
          >
            Suggest an incident →
          </a>
        </span>
      </footer>

      {showBackToTop && (
        <button
          type="button"
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
        >
          ↑ Top
        </button>
      )}

      <IncidentModal
        incident={activeIncident}
        onClose={() => setActiveIncidentId(null)}
        hasPrev={activeIndex > 0}
        hasNext={activeIndex >= 0 && activeIndex < orderedFiltered.length - 1}
        onPrev={() => {
          if (activeIndex > 0) setActiveIncidentId(orderedFiltered[activeIndex - 1].id);
        }}
        onNext={() => {
          if (activeIndex >= 0 && activeIndex < orderedFiltered.length - 1) {
            setActiveIncidentId(orderedFiltered[activeIndex + 1].id);
          }
        }}
      />

      <EraStoryModal
        open={storyOpen}
        incidents={allIncidents}
        onClose={() => setStoryOpen(false)}
        onFilterEra={(range) => {
          setEraFilter(range);
          setSelectedYear(null);
        }}
        onOpenIncident={(id) => setActiveIncidentId(id)}
      />
    </div>
  );
}

export default App;
