import { useEffect, useMemo, useState } from 'react';
import type { Incident } from '../types';

export interface EraRange {
  start: number;
  end: number;
  label: string;
}

interface EraConfig {
  id: string;
  start: number;
  end: number;
  rangeLabel: string;
  name: string;
  headline: string;
  description: string;
  blastRadius: string;
  blastPct: number;
  dominantVectors: string[];
  examples: { id: string; label: string }[];
}

const ERA_CONFIGS: EraConfig[] = [
  {
    id: 'era-1',
    start: 1998,
    end: 2005,
    rangeLabel: '1998 – 2005',
    name: 'Worms & Legacy Limits',
    headline: 'Failures hit individual PCs, mail servers, and standalone systems.',
    description:
      'Self-propagating worms (ILOVEYOU, SQL Slammer) saturated early networks while hardcoded integer/unit assumptions (Mars Climate Orbiter, Comair) caused sudden crashes.',
    blastRadius: 'Isolated hosts & enterprise LANs',
    blastPct: 32,
    dominantVectors: ['Mass-mailing worms', 'Buffer overflows', 'Unit & integer bugs'],
    examples: [
      { id: '1999-mars-climate-orbiter', label: 'Mars Climate Orbiter (1999)' },
      { id: '2000-iloveyou-worm', label: 'ILOVEYOU Worm (2000)' },
      { id: '2003-sql-slammer', label: 'SQL Slammer (2003)' },
    ],
  },
  {
    id: 'era-2',
    start: 2006,
    end: 2017,
    rangeLabel: '2006 – 2017',
    name: 'Mega-Breaches & Wipers',
    headline: 'Attacks scaled to nation-states, payment networks, and 100M+ user databases.',
    description:
      'Cyberweapons crossed into physical infrastructure (Stuxnet, Ukraine Grid), while wormable ransomware (WannaCry, NotPetya) and unpatched web stacks caused billion-dollar losses.',
    blastRadius: 'Global enterprises & national infrastructure',
    blastPct: 68,
    dominantVectors: ['Nation-state wipers', 'Ransomware', 'Unpatched web/POS'],
    examples: [
      { id: '2010-stuxnet', label: 'Stuxnet (2010)' },
      { id: '2014-heartbleed', label: 'Heartbleed (2014)' },
      { id: '2017-notpetya', label: 'NotPetya (2017)' },
    ],
  },
  {
    id: 'era-3',
    start: 2018,
    end: 2026,
    rangeLabel: '2018 – 2026',
    name: 'Cloud Monoculture & Supply Chain',
    headline: 'A single config file, DNS race condition, or build dependency can halt millions.',
    description:
      'Modern software shares common cloud control planes (AWS, M365, Cloudflare) and open-source pipelines (Log4j, SolarWinds, XZ Utils), turning single-point bugs into global events.',
    blastRadius: 'Shared global cloud & software supply chains',
    blastPct: 96,
    dominantVectors: ['Control-plane & DNS bugs', 'Supply-chain compromises', 'MFA / Vishing'],
    examples: [
      { id: '2020-solarwinds', label: 'SolarWinds (2020)' },
      { id: '2024-crowdstrike-bsod', label: 'CrowdStrike BSOD (2024)' },
      { id: '2025-aws-us-east-1-dynamodb', label: 'AWS DynamoDB DNS (2025)' },
    ],
  },
];

interface EraEvolutionProps {
  incidents: Incident[];
  activeEraFilter: EraRange | null;
  onFilterEra: (range: EraRange | null) => void;
  onOpenIncident: (id: string) => void;
}

export function EraEvolution({
  incidents,
  activeEraFilter,
  onFilterEra,
  onOpenIncident,
}: EraEvolutionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % ERA_CONFIGS.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const eraStats = useMemo(() => {
    return ERA_CONFIGS.map((era) => {
      let crashes = 0;
      let cyberattacks = 0;
      for (const item of incidents) {
        if (item.year >= era.start && item.year <= era.end) {
          if (item.type === 'crash') crashes++;
          else cyberattacks++;
        }
      }
      const total = crashes + cyberattacks;
      return {
        crashes,
        cyberattacks,
        total,
        crashPct: total > 0 ? Math.round((crashes / total) * 100) : 0,
        cyberPct: total > 0 ? Math.round((cyberattacks / total) * 100) : 0,
      };
    });
  }, [incidents]);

  const currentEra = ERA_CONFIGS[activeIndex];
  const currentStats = eraStats[activeIndex];
  const isFilteredToCurrent =
    activeEraFilter?.start === currentEra.start && activeEraFilter?.end === currentEra.end;

  return (
    <section className="insights-section era-evolution" aria-label="How failures evolved from 1998 to 2026">
      <div className="insights-header">
        <div>
          <span className="year-strip-title">How Failures Evolved (1998–2026)</span>
        </div>

        <div className="era-controls">
          <button
            type="button"
            className="filter-btn"
            aria-pressed={isPlaying}
            onClick={() => setIsPlaying((p) => !p)}
          >
            {isPlaying ? '⏸ Pause story' : '▶ Play evolution'}
          </button>
          <button
            type="button"
            className="filter-btn"
            aria-pressed={isFilteredToCurrent}
            onClick={() =>
              onFilterEra(
                isFilteredToCurrent
                  ? null
                  : { start: currentEra.start, end: currentEra.end, label: currentEra.rangeLabel },
              )
            }
          >
            {isFilteredToCurrent
              ? `Showing ${currentEra.rangeLabel} (Clear)`
              : `Filter timeline to ${currentEra.rangeLabel}`}
          </button>
        </div>
      </div>

      <div className="era-stepper" role="tablist" aria-label="Select failure era">
        {ERA_CONFIGS.map((era, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={era.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`era-step-btn ${isActive ? 'active' : ''}`}
              onClick={() => {
                setIsPlaying(false);
                setActiveIndex(idx);
              }}
            >
              <span className="era-step-range">{era.rangeLabel}</span>
              <span className="era-step-name">{era.name}</span>
              <span className="era-step-count">{eraStats[idx].total.toLocaleString('en-US')} events</span>
            </button>
          );
        })}
      </div>

      <div key={currentEra.id} className="era-stage" role="tabpanel">
        <div className="era-stage-copy">
          <h3 className="era-stage-headline">{currentEra.headline}</h3>
          <p className="era-stage-desc">{currentEra.description}</p>

          <div className="era-examples">
            <span className="filter-label">Key Examples:</span>
            {currentEra.examples.map((ex) => (
              <button
                key={ex.id}
                type="button"
                className="landmark-pill"
                onClick={() => onOpenIncident(ex.id)}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <div className="era-stage-metrics">
          <div className="metric-block">
            <div className="metric-head">
              <span>Blast Radius Scale</span>
              <span className="metric-note">{currentEra.blastRadius}</span>
            </div>
            <div className="metric-bar-track">
              <div
                className="metric-bar-fill primary"
                style={{ inlineSize: `${currentEra.blastPct}%` }}
              />
            </div>
          </div>

          <div className="metric-block">
            <div className="metric-head">
              <span>Crashes vs. Cyberattacks ({currentStats.total.toLocaleString('en-US')})</span>
              <span className="metric-note">
                {currentStats.crashPct}% crashes • {currentStats.cyberPct}% cyber
              </span>
            </div>
            <div className="metric-bar-track split">
              <div
                className="metric-bar-fill crash"
                style={{ inlineSize: `${currentStats.crashPct}%` }}
              />
              <div
                className="metric-bar-fill cyber"
                style={{ inlineSize: `${currentStats.cyberPct}%` }}
              />
            </div>
          </div>

          <div className="era-vectors">
            {currentEra.dominantVectors.map((v) => (
              <span key={v} className="lesson-pill">
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

