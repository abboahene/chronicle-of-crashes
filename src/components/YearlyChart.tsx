import { useState } from 'react';
import type { Incident } from '../types';

interface BarDatum {
  key: string;
  label: string;
  fullLabel: string;
  crashes: number;
  cyberattacks: number;
  total: number;
  yearValue?: number;
}

interface YearlyChartProps {
  data: { year: number; items: Incident[] }[];
  selectedYear: number | null;
  onSelectYear: (year: number) => void;
  onClearYear: () => void;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const MONTH_PATTERN = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i;

function extractMonthIndex(dateStr: string): number | null {
  const clean = dateStr.replace(/\(KEV added[^)]*\)/i, '').trim();

  const isoMatch = /^\d{4}-(\d{2})(?:-\d{2})?/.exec(clean);
  if (isoMatch) {
    const m = Number(isoMatch[1]);
    if (m >= 1 && m <= 12) return m - 1;
  }

  const nameMatch = MONTH_PATTERN.exec(clean);
  if (nameMatch) {
    const abbr = nameMatch[1].slice(0, 3).toLowerCase();
    const idx = MONTHS.findIndex((m) => m.toLowerCase() === abbr);
    if (idx >= 0) return idx;
  }

  return null;
}

const CHART_MODE_KEY = 'chronicle-chart-mode';

export function YearlyChart({
  data,
  selectedYear,
  onSelectYear,
  onClearYear,
}: YearlyChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'bar' | 'line'>(() => {
    try {
      return localStorage.getItem(CHART_MODE_KEY) === 'line' ? 'line' : 'bar';
    } catch {
      return 'bar';
    }
  });

  const handleSetChartMode = (mode: 'bar' | 'line') => {
    setChartMode(mode);
    try {
      localStorage.setItem(CHART_MODE_KEY, mode);
    } catch {
      // Ignore storage errors in restricted contexts
    }
  };

  const isMonthly = selectedYear !== null;

  const bars: BarDatum[] = isMonthly
    ? (() => {
        const yearBucket = data.find((d) => d.year === selectedYear);
        const items = yearBucket?.items ?? [];
        const buckets = MONTHS.map((m, idx) => ({
          key: `m-${idx}`,
          label: m,
          fullLabel: `${m} ${selectedYear}`,
          crashes: 0,
          cyberattacks: 0,
          total: 0,
        }));
        const undated = {
          key: 'm-undated',
          label: 'Year-only',
          fullLabel: `${selectedYear} (Month unspecified)`,
          crashes: 0,
          cyberattacks: 0,
          total: 0,
        };

        for (const item of items) {
          const mIdx = extractMonthIndex(item.date);
          const target = mIdx !== null ? buckets[mIdx] : undated;
          if (item.type === 'crash') target.crashes++;
          else target.cyberattacks++;
          target.total++;
        }

        return undated.total > 0 ? [...buckets, undated] : buckets;
      })()
    : data.map(({ year, items }) => {
        let crashes = 0;
        let cyberattacks = 0;
        for (const item of items) {
          if (item.type === 'crash') crashes++;
          else cyberattacks++;
        }
        return {
          key: `y-${year}`,
          label: String(year).slice(-2),
          fullLabel: String(year),
          crashes,
          cyberattacks,
          total: crashes + cyberattacks,
          yearValue: year,
        };
      });

  const maxTotal = Math.max(1, ...bars.map((b) => b.total));
  const maxSeries = Math.max(1, ...bars.map((b) => Math.max(b.crashes, b.cyberattacks)));
  const activeDatum = bars.find((b) => b.key === hoveredKey) ?? null;

  // SVG Line Chart geometry
  const svgW = 900;
  const svgH = 180;
  const padLeft = 42;
  const padRight = 20;
  const padTop = 16;
  const padBottom = 26;
  const plotW = svgW - padLeft - padRight;
  const plotH = svgH - padTop - padBottom;

  const getX = (idx: number) =>
    bars.length <= 1 ? padLeft + plotW / 2 : padLeft + (idx / (bars.length - 1)) * plotW;
  const getY = (val: number) => padTop + plotH - (val / maxSeries) * plotH;

  const crashPoints = bars.map((b, i) => `${getX(i).toFixed(1)},${getY(b.crashes).toFixed(1)}`).join(' ');
  const cyberPoints = bars
    .map((b, i) => `${getX(i).toFixed(1)},${getY(b.cyberattacks).toFixed(1)}`)
    .join(' ');

  return (
    <section
      className="chart-section"
      aria-label={
        isMonthly
          ? `Monthly incidents chart for ${selectedYear}`
          : 'Incidents per year chart (1998–2026)'
      }
    >
      <div className="chart-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span className="year-strip-title">
              {isMonthly
                ? `Monthly Breakdown — ${selectedYear}`
                : 'Incidents per Year (1998–2026)'}
            </span>
            {isMonthly && (
              <button type="button" className="filter-btn" onClick={onClearYear}>
                ← All Years (1998–2026)
              </button>
            )}
          </div>

          <div className="chart-readout" aria-live="polite">
            {activeDatum ? (
              <>
                <strong>{activeDatum.fullLabel}</strong>
                <span>•</span>
                <span className="readout-crash">{activeDatum.crashes} crashes</span>
                <span>•</span>
                <span className="readout-cyber">{activeDatum.cyberattacks} cyberattacks</span>
                <span>({activeDatum.total} total)</span>
              </>
            ) : (
              <span>
                {isMonthly
                  ? `Hover any month in ${selectedYear} to inspect counts`
                  : 'Hover a point or bar to inspect, or click a year for monthly breakdown'}
              </span>
            )}
          </div>
        </div>

        <div className="chart-controls">
          <div className="chart-legend" aria-hidden="true">
            <span className="legend-item">
              <span className="legend-swatch crash" />
              Software Crashes
            </span>
            <span className="legend-item">
              <span className="legend-swatch cyber" />
              Cyberattacks
            </span>
          </div>

          <div className="segmented-group" role="group" aria-label="Chart type">
            <button
              type="button"
              className="filter-btn"
              aria-pressed={chartMode === 'bar'}
              onClick={() => handleSetChartMode('bar')}
            >
              Bar
            </button>
            <button
              type="button"
              className="filter-btn"
              aria-pressed={chartMode === 'line'}
              onClick={() => handleSetChartMode('line')}
            >
              Line
            </button>
          </div>
        </div>
      </div>

      {chartMode === 'bar' ? (
        <div
          className={`chart-bars ${isMonthly ? 'monthly' : ''}`}
          role="group"
          aria-label={isMonthly ? `${selectedYear} monthly counts` : 'Yearly incident counts'}
        >
          {bars.map((bar) => {
            const crashPct = (bar.crashes / maxTotal) * 100;
            const cyberPct = (bar.cyberattacks / maxTotal) * 100;

            return (
              <button
                key={bar.key}
                type="button"
                className="chart-bar-btn"
                onClick={() => {
                  if (!isMonthly && bar.yearValue !== undefined) {
                    setHoveredKey(null);
                    onSelectYear(bar.yearValue);
                  }
                }}
                onMouseEnter={() => setHoveredKey(bar.key)}
                onMouseLeave={() => setHoveredKey(null)}
                onFocus={() => setHoveredKey(bar.key)}
                onBlur={() => setHoveredKey(null)}
                aria-label={`${bar.fullLabel}: ${bar.crashes} software crashes, ${bar.cyberattacks} cyberattacks`}
              >
                <span className="chart-count" aria-hidden="true">
                  {bar.total > 0 ? bar.total : ''}
                </span>
                <span className="chart-track" aria-hidden="true">
                  <span className="chart-seg cyber" style={{ blockSize: `${cyberPct}%` }} />
                  <span className="chart-seg crash" style={{ blockSize: `${crashPct}%` }} />
                </span>
                <span className="chart-year-label">{bar.label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="line-chart-wrap">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="line-chart-svg"
            role="img"
            aria-label={
              isMonthly
                ? `Line chart of monthly crashes and cyberattacks in ${selectedYear}`
                : 'Line chart of yearly crashes and cyberattacks from 1998 to 2026'
            }
          >
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padTop + plotH * (1 - ratio);
              const showLabel = ratio === 0 || ratio === 0.5 || ratio === 1;
              const tickVal = Math.round(maxSeries * ratio);
              return (
                <g key={ratio}>
                  <line
                    x1={padLeft}
                    x2={svgW - padRight}
                    y1={y}
                    y2={y}
                    className="line-grid"
                  />
                  {showLabel && (
                    <text
                      x={padLeft - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="line-x-label"
                    >
                      {tickVal}
                    </text>
                  )}
                </g>
              );
            })}

            <polyline
              fill="none"
              className="line-path cyber"
              points={cyberPoints}
            />
            <polyline
              fill="none"
              className="line-path crash"
              points={crashPoints}
            />

            {bars.map((bar, i) => {
              const x = getX(i);
              const yCrash = getY(bar.crashes);
              const yCyber = getY(bar.cyberattacks);
              const isHovered = hoveredKey === bar.key;

              return (
                <g
                  key={bar.key}
                  className={`line-point-group ${!isMonthly ? 'clickable' : ''}`}
                  onMouseEnter={() => setHoveredKey(bar.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={() => {
                    if (!isMonthly && bar.yearValue !== undefined) {
                      setHoveredKey(null);
                      onSelectYear(bar.yearValue);
                    }
                  }}
                >
                  <rect
                    x={x - plotW / (bars.length * 2)}
                    y={padTop}
                    width={plotW / bars.length}
                    height={plotH + padBottom}
                    fill="transparent"
                  />
                  {isHovered && (
                    <line
                      x1={x}
                      x2={x}
                      y1={padTop}
                      y2={padTop + plotH}
                      className="line-hover-rule"
                    />
                  )}
                  <circle
                    cx={x}
                    cy={yCyber}
                    r={isHovered ? 5 : 3.2}
                    className="line-dot cyber"
                  />
                  <circle
                    cx={x}
                    cy={yCrash}
                    r={isHovered ? 5 : 3.2}
                    className="line-dot crash"
                  />
                  <text
                    x={x}
                    y={svgH - 6}
                    textAnchor="middle"
                    className="line-x-label"
                  >
                    {bar.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
