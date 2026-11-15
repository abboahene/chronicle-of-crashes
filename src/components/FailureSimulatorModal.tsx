import { useEffect, useRef, useState } from 'react';

type SimTab = 'retry' | 'canary' | 'supply';

interface FailureSimulatorModalProps {
  open: boolean;
  onClose: () => void;
}

export function FailureSimulatorModal({ open, onClose }: FailureSimulatorModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<SimTab>('retry');

  // Simulator 1: Retry Storm
  const [retries, setRetries] = useState(3);
  const [backoffJitter, setBackoffJitter] = useState(false);
  const [circuitBreaker, setCircuitBreaker] = useState(false);

  // Simulator 2: Canary vs Global Rollout
  const [stagedRings, setStagedRings] = useState(false);
  const [autoRollback, setAutoRollback] = useState(false);
  const [triggeredRollout, setTriggeredRollout] = useState(false);

  // Simulator 3: Supply-Chain Dependency Cascade
  const [lockfilePinned, setLockfilePinned] = useState(false);
  const [runtimeSandbox, setRuntimeSandbox] = useState(false);
  const [injectedPkg, setInjectedPkg] = useState(false);

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

  // Retry storm math
  const rawMultiplier = 1 + retries * 0.85;
  const effectiveLoadPct = circuitBreaker
    ? Math.round(100 * (backoffJitter ? 0.92 : 1.05))
    : Math.round(100 * (backoffJitter ? 1 + retries * 0.14 : rawMultiplier));
  const retryCollapsed = effectiveLoadPct > 180;

  // Canary math
  const blastRadiusPct = !triggeredRollout
    ? 0
    : stagedRings
      ? autoRollback
        ? 1
        : 10
      : 100;

  // Supply chain math
  const compromisedServices = !injectedPkg
    ? 0
    : lockfilePinned
      ? 0
      : runtimeSandbox
        ? 1
        : 5;

  return (
    <dialog
      ref={dialogRef}
      className="incident-dialog story-dialog"
      aria-labelledby="sim-modal-title"
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      {open && (
        <>
          <header className="dialog-header">
            <div>
              <span className="eyebrow">Interactive Failure Lab</span>
              <h2 id="sim-modal-title" className="dialog-title">
                Failure Mode Simulators
              </h2>
            </div>
            <button
              type="button"
              className="dialog-close"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close failure simulators"
            >
              ×
            </button>
          </header>

          <div className="dialog-body story-body">
            <div className="stack-tabs" role="tablist" aria-label="Simulation scenarios">
              <button
                type="button"
                className="filter-btn"
                aria-pressed={tab === 'retry'}
                onClick={() => setTab('retry')}
              >
                1. Retry Storm / Thundering Herd
              </button>
              <button
                type="button"
                className="filter-btn"
                aria-pressed={tab === 'canary'}
                onClick={() => setTab('canary')}
              >
                2. Bad Config Blast Radius
              </button>
              <button
                type="button"
                className="filter-btn"
                aria-pressed={tab === 'supply'}
                onClick={() => setTab('supply')}
              >
                3. Supply-Chain Cascade
              </button>
            </div>

            {tab === 'retry' && (
              <div className="sim-panel">
                <div className="sim-controls">
                  <h3 className="story-headline">Why a 5% timeout becomes a 100% outage</h3>
                  <p className="story-desc">
                    When a downstream DB slows down, aggressive client retries multiply traffic
                    faster than servers can recover. Toggle mitigations below to stabilize the fleet.
                  </p>

                  <label className="sim-slider-label">
                    <span>
                      Client Retries per Failed Request: <strong>{retries}×</strong>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      value={retries}
                      onChange={(e) => setRetries(Number(e.target.value))}
                    />
                  </label>

                  <div className="sim-toggles">
                    <label className="checklist-item">
                      <input
                        type="checkbox"
                        checked={backoffJitter}
                        onChange={(e) => setBackoffJitter(e.target.checked)}
                      />
                      <span>Exponential Backoff + Full Jitter</span>
                    </label>
                    <label className="checklist-item">
                      <input
                        type="checkbox"
                        checked={circuitBreaker}
                        onChange={(e) => setCircuitBreaker(e.target.checked)}
                      />
                      <span>Circuit Breaker (fail fast above error threshold)</span>
                    </label>
                  </div>
                </div>

                <div className="sim-stage">
                  <div className="sim-meter-header">
                    <span>Downstream Load vs. Capacity (100% = max healthy)</span>
                    <strong className={retryCollapsed ? 'sim-status-bad' : 'sim-status-ok'}>
                      {effectiveLoadPct}% {retryCollapsed ? '— CASCADE COLLAPSE' : '— STABLE'}
                    </strong>
                  </div>
                  <div className="sim-meter-track">
                    <div
                      className={`sim-meter-fill ${retryCollapsed ? 'is-bad' : 'is-ok'}`}
                      style={{ width: `${Math.min(100, (effectiveLoadPct / 450) * 100)}%` }}
                    />
                    <div className="sim-capacity-line" title="100% Healthy Capacity" />
                  </div>
                  <p className="sim-caption">
                    {retryCollapsed
                      ? 'Retries are queueing faster than responses return — classic thundering herd.'
                      : 'Backoff/circuit-breaking keeps load bounded so the backend recovers cleanly.'}
                  </p>
                </div>
              </div>
            )}

            {tab === 'canary' && (
              <div className="sim-panel">
                <div className="sim-controls">
                  <h3 className="story-headline">Global Config Push vs. Staged Canary Rings</h3>
                  <p className="story-desc">
                    Major outages like CrowdStrike (2024) and Fastly (2021) pushed a single bad
                    file globally at once. Test how staged rings + health gates contain the blast.
                  </p>

                  <div className="sim-toggles">
                    <label className="checklist-item">
                      <input
                        type="checkbox"
                        checked={stagedRings}
                        onChange={(e) => setStagedRings(e.target.checked)}
                      />
                      <span>Staged Rollout Rings (1% Canary → 10% → 100%)</span>
                    </label>
                    <label className="checklist-item">
                      <input
                        type="checkbox"
                        checked={autoRollback}
                        onChange={(e) => setAutoRollback(e.target.checked)}
                      />
                      <span>Automatic Health-Gate Rollback</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    className="story-launch-btn"
                    onClick={() => setTriggeredRollout(true)}
                  >
                    ⚡ Simulate Bad Config Push
                  </button>
                </div>

                <div className="sim-stage">
                  <div className="sim-meter-header">
                    <span>Fleet Blast Radius</span>
                    <strong className={blastRadiusPct > 20 ? 'sim-status-bad' : 'sim-status-ok'}>
                      {triggeredRollout ? `${blastRadiusPct}% of global fleet impacted` : 'Ready'}
                    </strong>
                  </div>
                  <div className="sim-fleet-grid" aria-hidden="true">
                    {Array.from({ length: 20 }).map((_, idx) => {
                      const pctThreshold = (idx + 1) * 5;
                      const affected = triggeredRollout && pctThreshold <= blastRadiusPct + 4;
                      return (
                        <div
                          key={idx}
                          className={`sim-node ${affected ? 'is-down' : 'is-up'}`}
                        />
                      );
                    })}
                  </div>
                  <p className="sim-caption">
                    {!triggeredRollout
                      ? 'Click "Simulate Bad Config Push" to observe fleet impact.'
                      : blastRadiusPct === 100
                        ? 'Global simultaneous push took down 100% of hosts before operators could react.'
                        : autoRollback
                          ? 'Canary ring (1%) caught the crash immediately and auto-rolled back.'
                          : 'Staged rings limited the outage to the early ring while halting wider rollout.'}
                  </p>
                </div>
              </div>
            )}

            {tab === 'supply' && (
              <div className="sim-panel">
                <div className="sim-controls">
                  <h3 className="story-headline">Depth-3 Transitive Dependency Compromise</h3>
                  <p className="story-desc">
                    An attacker compromises a tiny utility package 3 levels deep in your dependency
                    tree (like Log4j, XZ Utils, or event-stream). Test defense-in-depth controls.
                  </p>

                  <div className="sim-toggles">
                    <label className="checklist-item">
                      <input
                        type="checkbox"
                        checked={lockfilePinned}
                        onChange={(e) => setLockfilePinned(e.target.checked)}
                      />
                      <span>Hash-Pinned Lockfiles + Provenance Verification in CI</span>
                    </label>
                    <label className="checklist-item">
                      <input
                        type="checkbox"
                        checked={runtimeSandbox}
                        onChange={(e) => setRuntimeSandbox(e.target.checked)}
                      />
                      <span>Egress Firewall / Runtime Sandboxing</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    className="story-launch-btn"
                    onClick={() => setInjectedPkg(true)}
                  >
                    🧪 Inject Malicious Upstream Release
                  </button>
                </div>

                <div className="sim-stage">
                  <div className="sim-meter-header">
                    <span>Production Services Compromised</span>
                    <strong className={compromisedServices > 1 ? 'sim-status-bad' : 'sim-status-ok'}>
                      {injectedPkg ? `${compromisedServices} / 5 services` : 'Ready'}
                    </strong>
                  </div>
                  <div className="sim-chain">
                    {['Auth API', 'Billing', 'CI Runner', 'Analytics', 'Admin'].map((svc, idx) => {
                      const hit = injectedPkg && idx < compromisedServices;
                      return (
                        <div key={svc} className={`sim-svc-chip ${hit ? 'is-down' : 'is-up'}`}>
                          {svc}
                        </div>
                      );
                    })}
                  </div>
                  <p className="sim-caption">
                    {!injectedPkg
                      ? 'Click "Inject Malicious Upstream Release" to trace propagation.'
                      : lockfilePinned
                        ? 'Blocked in CI! Hash mismatch & unverified provenance rejected the tampered package.'
                        : runtimeSandbox
                          ? 'Package loaded, but egress firewall blocked outbound C2 exfiltration across 4/5 services.'
                          : 'Unpinned builds pulled the compromised version into all 5 production services.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <footer className="dialog-footer">
            <span className="timeline-count">
              Interactive models inspired by real postmortems in the archive.
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
