import { useEffect, useMemo, useRef, useState } from 'react';
import type { Incident } from '../types';

interface StackLayer {
  id: string;
  name: string;
  tagline: string;
  keywords: RegExp;
  checklist: { id: string; text: string }[];
}

const STACK_LAYERS: StackLayer[] = [
  {
    id: 'dns-bgp',
    name: 'DNS & BGP',
    tagline: 'Name resolution, Anycast routing, and control-plane reachability',
    keywords: /\b(dns|bgp|route53|dynamodb|anycast|nameserver|whois|nxdomain)\b/i,
    checklist: [
      { id: 'dns-1', text: 'Keep out-of-band console & management access independent of your primary DNS.' },
      { id: 'dns-2', text: 'Use staged rollouts + automated syntax/sanity checks before publishing BGP or DNS zone changes.' },
      { id: 'dns-3', text: 'Monitor TTL expiration and stale DNS cache behavior during failover drills.' },
      { id: 'dns-4', text: 'Enforce RPKI / route-origin validation to block accidental BGP leaks.' },
    ],
  },
  {
    id: 'cloud-control',
    name: 'Cloud Control Plane',
    tagline: 'Multi-region orchestration, IAM, quotas, and automated config pushes',
    keywords: /\b(aws|azure|gcp|google cloud|cloudflare|microsoft 365|control plane|iam|region|outage)\b/i,
    checklist: [
      { id: 'cloud-1', text: 'Decouple data-plane traffic serving from control-plane configuration updates.' },
      { id: 'cloud-2', text: 'Use cellular / regional isolation so one region cannot poison global state.' },
      { id: 'cloud-3', text: 'Gate automated fleet-wide config pushes behind canary rings (1% → 10% → 100%).' },
      { id: 'cloud-4', text: 'Verify quota limits and retry-storm backoff across dependent microservices.' },
    ],
  },
  {
    id: 'cicd-supply',
    name: 'CI/CD & Dependencies',
    tagline: 'Build pipelines, package registries, SBOMs, and transitive libraries',
    keywords: /\b(supply chain|npm|log4j|solarwinds|xz|codecov|dependency|package|build|ci\/cd)\b/i,
    checklist: [
      { id: 'cicd-1', text: 'Pin exact dependency hashes via lockfiles and verify package provenance / SLSA.' },
      { id: 'cicd-2', text: 'Generate an SBOM on every release so zero-days (e.g., Log4Shell) can be inventoried in minutes.' },
      { id: 'cicd-3', text: 'Isolate CI runners with ephemeral credentials and least-privilege artifact signing.' },
      { id: 'cicd-4', text: 'Audit maintainer handoffs and unexpected binary blobs in upstream packages.' },
    ],
  },
  {
    id: 'tls-auth',
    name: 'TLS, Certs & Auth',
    tagline: 'Certificate rotation, OAuth/SSO tokens, and credential hygiene',
    keywords: /\b(tls|ssl|cert|certificate|oauth|sso|token|heartbleed|auth|credential|password)\b/i,
    checklist: [
      { id: 'tls-1', text: 'Automate certificate renewal (ACME) with alerts at 30, 14, and 7 days before expiry.' },
      { id: 'tls-2', text: 'Test certificate rotation in staging with identical SNI and intermediate chains.' },
      { id: 'tls-3', text: 'Enforce phishing-resistant MFA (WebAuthn/FIDO2) on all production and cloud admin accounts.' },
      { id: 'tls-4', text: 'Rotate long-lived API keys automatically and scan commits for leaked secrets.' },
    ],
  },
  {
    id: 'data-storage',
    name: 'Databases & Storage',
    tagline: 'Schema migrations, replication lag, backups, and capacity limits',
    keywords: /\b(database|sql|postgres|mysql|dynamodb|s3|storage|backup|migration|corruption)\b/i,
    checklist: [
      { id: 'db-1', text: 'Run backward-compatible (expand-and-contract) migrations without table-wide locks.' },
      { id: 'db-2', text: 'Regularly test immutable, offline/air-gapped backup restores—not just backup creation.' },
      { id: 'db-3', text: 'Protect connection pools with timeouts, circuit breakers, and read-replica fallback.' },
      { id: 'db-4', text: 'Alert on disk/inode saturation, transaction ID wraparound, and replication lag.' },
    ],
  },
  {
    id: 'edge-kernel',
    name: 'Edge, Kernel & Memory',
    tagline: 'OS drivers, bounds checking, integer overflows, and leap-second/time bugs',
    keywords: /\b(kernel|driver|crowdstrike|bsod|buffer|overflow|integer|memory|leap second|y2k|null)\b/i,
    checklist: [
      { id: 'edge-1', text: 'Validate untrusted or dynamically loaded parsers against fuzzing & strict bounds checks.' },
      { id: 'edge-2', text: 'Prefer memory-safe languages or compiler sanitizers (ASan/UBSan) for low-level parsers.' },
      { id: 'edge-3', text: 'Test kernel/agent updates with safe-mode recovery and staged hardware rings.' },
      { id: 'edge-4', text: 'Use monotonic clocks for durations and test leap-second / clock-skew edge cases.' },
    ],
  },
];

const CHECKLIST_STORAGE_KEY = 'chronicle-stack-checklist';

interface StackExplorerModalProps {
  open: boolean;
  incidents: Incident[];
  onClose: () => void;
  onOpenIncident: (id: string) => void;
}

export function StackExplorerModal({
  open,
  incidents,
  onClose,
  onOpenIncident,
}: StackExplorerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeLayerId, setActiveLayerId] = useState<string>(STACK_LAYERS[0].id);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });
  const [copiedMd, setCopiedMd] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  const activeLayer = STACK_LAYERS.find((l) => l.id === activeLayerId) ?? STACK_LAYERS[0];

  const matchingIncidents = useMemo(() => {
    return incidents
      .filter((inc) =>
        activeLayer.keywords.test(
          `${inc.title} ${inc.vectorOrCause} ${inc.summary} ${inc.postmortem}`,
        ),
      )
      .slice(0, 6);
  }, [incidents, activeLayer]);

  const toggleItem = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const completedCount = activeLayer.checklist.filter((c) => checked[c.id]).length;

  const handleCopyMarkdown = async () => {
    const lines = [
      `## Pre-Deploy Checklist: ${activeLayer.name}`,
      ...activeLayer.checklist.map((c) => `- [${checked[c.id] ? 'x' : ' '}] ${c.text}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedMd(true);
      window.setTimeout(() => setCopiedMd(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="incident-dialog story-dialog"
      aria-labelledby="stack-modal-title"
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      {open && (
        <>
          <header className="dialog-header">
            <div>
              <span className="eyebrow">Actionable Engineering Intelligence</span>
              <h2 id="stack-modal-title" className="dialog-title">
                Stack-to-Failure Explorer &amp; Checklists
              </h2>
            </div>
            <button
              type="button"
              className="dialog-close"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close stack explorer"
            >
              ×
            </button>
          </header>

          <div className="dialog-body story-body">
            <div className="stack-tabs" role="tablist" aria-label="Infrastructure layers">
              {STACK_LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  role="tab"
                  aria-selected={layer.id === activeLayer.id}
                  className="filter-btn"
                  aria-pressed={layer.id === activeLayer.id}
                  onClick={() => {
                    setActiveLayerId(layer.id);
                    setCopiedMd(false);
                  }}
                >
                  {layer.name}
                </button>
              ))}
            </div>

            <div className="stack-grid">
              <div className="stack-panel">
                <div className="stack-panel-head">
                  <div>
                    <h3 className="story-headline" style={{ fontSize: '1.05rem' }}>
                      Pre-Deploy Checklist ({completedCount}/{activeLayer.checklist.length})
                    </h3>
                    <p className="story-desc" style={{ marginTop: '0.2rem' }}>
                      {activeLayer.tagline}
                    </p>
                  </div>
                  <button type="button" className="export-btn" onClick={handleCopyMarkdown}>
                    {copiedMd ? '✓ Copied MD' : 'Copy Markdown'}
                  </button>
                </div>

                <ul className="checklist-list">
                  {activeLayer.checklist.map((item) => (
                    <li key={item.id}>
                      <label className="checklist-item">
                        <input
                          type="checkbox"
                          checked={Boolean(checked[item.id])}
                          onChange={() => toggleItem(item.id)}
                        />
                        <span className={checked[item.id] ? 'checklist-done' : ''}>
                          {item.text}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="stack-panel">
                <h3 className="story-headline" style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>
                  Historical Failures in This Layer
                </h3>
                <div className="stack-incidents-list">
                  {matchingIncidents.map((inc) => (
                    <button
                      key={inc.id}
                      type="button"
                      className="stack-incident-btn"
                      onClick={() => {
                        dialogRef.current?.close();
                        onOpenIncident(inc.id);
                      }}
                    >
                      <div className="stack-incident-meta">
                        <span className="impact-card-year">{inc.date}</span>
                        <span className={`badge ${inc.type}`}>{inc.type}</span>
                      </div>
                      <strong className="stack-incident-title">{inc.title}</strong>
                      <span className="stack-incident-cause">{inc.vectorOrCause}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <footer className="dialog-footer">
            <span className="timeline-count">
              Checklists save automatically in your browser for PRs &amp; architecture reviews.
            </span>
            <button
              type="button"
              className="dialog-nav-btn"
              onClick={() => dialogRef.current?.close()}
            >
              Close (Esc)
            </button>
          </footer>
        </>
      )}
    </dialog>
  );
}
