import { useEffect, useMemo, useRef, useState } from 'react';
import type { Incident } from '../types';
import type { EraRange } from './EraEvolution';

interface EraStoryConfig {
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

const STORY_ERAS: EraStoryConfig[] = [
  {
    id: 'era-1',
    start: 1998,
    end: 2005,
    rangeLabel: '1998 – 2005',
    name: 'Worms & Legacy Limits',
    headline: 'Failures hit individual PCs, mail servers, and standalone systems.',
    description:
      'Self-propagating worms (ILOVEYOU, SQL Slammer) saturated early networks while hardcoded integer and unit assumptions (Mars Climate Orbiter, Comair) triggered sudden crashes.',
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

function EraVisual({ eraId }: { eraId: string }) {
  if (eraId === 'era-1') {
    return (
      <svg viewBox="0 0 360 200" className="story-svg" role="img" aria-label="Era 1 worm propagation diagram">
        <defs>
          <radialGradient id="glow-era1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-crash)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent-crash)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="90" cy="100" r="64" fill="url(#glow-era1)" />
        <line x1="60" y1="100" x2="145" y2="55" className="svg-link" />
        <line x1="60" y1="100" x2="145" y2="145" className="svg-link" />
        <line x1="145" y1="55" x2="235" y2="55" className="svg-link" />
        <line x1="145" y1="145" x2="235" y2="145" className="svg-link" />
        <line x1="235" y1="55" x2="305" y2="100" className="svg-link" />
        <line x1="235" y1="145" x2="305" y2="100" className="svg-link" />

        <circle cx="60" cy="100" r="14" className="svg-node crash-node pulse-node" />
        <circle cx="145" cy="55" r="11" className="svg-node" />
        <circle cx="145" cy="145" r="11" className="svg-node" />
        <circle cx="235" cy="55" r="11" className="svg-node cyber-node" />
        <circle cx="235" cy="145" r="11" className="svg-node" />
        <circle cx="305" cy="100" r="13" className="svg-node crash-node" />

        <circle r="5" className="svg-packet packet-1">
          <animateMotion dur="2.2s" repeatCount="indefinite" path="M60,100 L145,55 L235,55 L305,100" />
        </circle>
        <circle r="4" className="svg-packet packet-2">
          <animateMotion dur="2.6s" repeatCount="indefinite" path="M60,100 L145,145 L235,145 L305,100" />
        </circle>

        <text x="60" y="132" textAnchor="middle" className="svg-caption">Host A</text>
        <text x="235" y="34" textAnchor="middle" className="svg-caption">Mail Worm</text>
        <text x="305" y="132" textAnchor="middle" className="svg-caption">Unit Bug</text>
      </svg>
    );
  }

  if (eraId === 'era-2') {
    return (
      <svg viewBox="0 0 360 200" className="story-svg" role="img" aria-label="Era 2 enterprise and grid blast diagram">
        <circle cx="180" cy="100" r="26" className="svg-wave wave-1" />
        <circle cx="180" cy="100" r="52" className="svg-wave wave-2" />
        <circle cx="180" cy="100" r="80" className="svg-wave wave-3" />

        {[
          [75, 48, 'Banks'],
          [285, 48, 'Power Grid'],
          [65, 152, 'POS / Retail'],
          [295, 152, '100M+ DBs'],
        ].map(([cx, cy, label]) => (
          <g key={String(label)}>
            <line x1="180" y1="100" x2={Number(cx)} y2={Number(cy)} className="svg-link" />
            <circle cx={Number(cx)} cy={Number(cy)} r="12" className="svg-node cyber-node" />
            <text x={Number(cx)} y={Number(cy) + 25} textAnchor="middle" className="svg-caption">
              {label}
            </text>
          </g>
        ))}

        <circle cx="180" cy="100" r="18" className="svg-node cyber-node pulse-node" />
        <text x="180" y="104" textAnchor="middle" className="svg-center-label">APT</text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 360 200" className="story-svg" role="img" aria-label="Era 3 cloud monoculture and supply chain diagram">
      <circle cx="180" cy="100" r="34" className="svg-wave cloud-wave-1" />
      <circle cx="180" cy="100" r="68" className="svg-wave cloud-wave-2" />

      {[
        [55, 42, 'Airlines'],
        [180, 26, 'Banks'],
        [305, 42, 'Hospitals'],
        [55, 158, 'SaaS Apps'],
        [180, 174, 'Dev Builds'],
        [305, 158, '8.5M+ Hosts'],
      ].map(([cx, cy, label]) => (
        <g key={String(label)}>
          <line x1="180" y1="100" x2={Number(cx)} y2={Number(cy)} className="svg-link active-link" />
          <circle cx={Number(cx)} cy={Number(cy)} r="9" className="svg-node" />
          <text
            x={Number(cx)}
            y={Number(cy) < 100 ? Number(cy) - 14 : Number(cy) + 20}
            textAnchor="middle"
            className="svg-caption"
          >
            {label}
          </text>
        </g>
      ))}

      <rect x="148" y="80" width="64" height="40" rx="10" className="svg-hub pulse-node" />
      <text x="180" y="98" textAnchor="middle" className="svg-center-label">CLOUD /</text>
      <text x="180" y="110" textAnchor="middle" className="svg-center-label">SUPPLY</text>
    </svg>
  );
}

interface EraStoryModalProps {
  open: boolean;
  incidents: Incident[];
  onClose: () => void;
  onFilterEra: (range: EraRange) => void;
  onOpenIncident: (id: string) => void;
}

export function EraStoryModal({
  open,
  incidents,
  onClose,
  onFilterEra,
  onOpenIncident,
}: EraStoryModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setActiveIndex(0);
      setIsPlaying(true);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      setIsPlaying(false);
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    let cleanupOutside: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      const onDown = (e: PointerEvent) => {
        pressedOutside = outside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e)) dialog.close();
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
      cleanupOutside = () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupOutside?.();
    };
  }, [onClose]);

  useEffect(() => {
    if (!open || !isPlaying) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % STORY_ERAS.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [open, isPlaying]);

  const eraStats = useMemo(() => {
    return STORY_ERAS.map((era) => {
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

  const currentEra = STORY_ERAS[activeIndex];
  const currentStats = eraStats[activeIndex];

  return (
    <dialog
      ref={dialogRef}
      className="incident-dialog story-dialog"
      aria-labelledby="story-modal-title"
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      {open && (
        <>
          <header className="dialog-header">
            <div>
              <span className="eyebrow">Interactive Evolution • 1998 – 2026</span>
              <h2 id="story-modal-title" className="dialog-title">
                How Failures Evolved
              </h2>
            </div>
            <button
              type="button"
              className="dialog-close"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close evolution story"
            >
              ×
            </button>
          </header>

          <div className="dialog-body story-body">
            <div className="era-stepper" role="tablist" aria-label="Story chapters">
              {STORY_ERAS.map((era, idx) => (
                <button
                  key={era.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === activeIndex}
                  className={`era-step-btn ${idx === activeIndex ? 'active' : ''}`}
                  onClick={() => {
                    setIsPlaying(false);
                    setActiveIndex(idx);
                  }}
                >
                  <span className="era-step-range">{era.rangeLabel}</span>
                  <span className="era-step-name">{era.name}</span>
                </button>
              ))}
            </div>

            <div key={currentEra.id} className="story-stage">
              <div className="story-visual-box">
                <EraVisual eraId={currentEra.id} />
              </div>

              <div className="story-copy">
                <h3 className="era-stage-headline">{currentEra.headline}</h3>
                <p className="era-stage-desc">{currentEra.description}</p>

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

                <div className="era-examples">
                  <span className="filter-label">Inspect Example:</span>
                  {currentEra.examples.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      className="landmark-pill"
                      onClick={() => {
                        dialogRef.current?.close();
                        onOpenIncident(ex.id);
                      }}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <footer className="dialog-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="dialog-nav-btn"
                onClick={() => {
                  setIsPlaying(false);
                  setActiveIndex((prev) => (prev - 1 + STORY_ERAS.length) % STORY_ERAS.length);
                }}
              >
                ← Prev Era
              </button>

              <button
                type="button"
                className="dialog-nav-btn"
                aria-pressed={isPlaying}
                onClick={() => setIsPlaying((p) => !p)}
              >
                {isPlaying ? '⏸ Pause' : '▶ Auto-play'}
              </button>

              <button
                type="button"
                className="dialog-nav-btn"
                onClick={() => {
                  setIsPlaying(false);
                  setActiveIndex((prev) => (prev + 1) % STORY_ERAS.length);
                }}
              >
                Next Era →
              </button>
            </div>

            <button
              type="button"
              className="filter-btn"
              aria-pressed="true"
              onClick={() => {
                onFilterEra({
                  start: currentEra.start,
                  end: currentEra.end,
                  label: currentEra.rangeLabel,
                });
                dialogRef.current?.close();
              }}
            >
              Filter timeline to {currentEra.rangeLabel}
            </button>
          </footer>
        </>
      )}
    </dialog>
  );
}

