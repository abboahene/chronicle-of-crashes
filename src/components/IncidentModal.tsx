import { useEffect, useRef, useState } from 'react';
import type { Incident } from '../types';
import { deriveLessons } from '../utils/lessons';

interface IncidentModalProps {
  incident: Incident | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function IncidentModal({
  incident,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: IncidentModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [incident?.id]);

  useEffect(() => {
    if (!incident) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        onPrev?.();
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        onNext?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [incident, hasPrev, hasNext, onPrev, onNext]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures in restricted contexts
    }
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (incident && !dialog.open) {
      dialog.showModal();
    } else if (!incident && dialog.open) {
      dialog.close();
    }
  }, [incident]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };

    dialog.addEventListener('close', handleClose);

    // Fallback light-dismiss for browsers without <dialog closedby="any">
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
        if (pressedOutside && outside(e)) {
          dialog.close();
        }
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

  return (
    <dialog
      ref={dialogRef}
      className="incident-dialog"
      aria-labelledby="incident-modal-title"
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      {incident && (
        <>
          <header className="dialog-header">
            <div>
              <div className="badge-group">
                <span className={`badge ${incident.type}`}>
                  {incident.type === 'crash' ? 'Software Crash' : 'Cyberattack'}
                </span>
                <span className={`badge severity-${incident.severity}`}>
                  {incident.severity}
                </span>
                <span className="card-date">{incident.date}</span>
              </div>
              <h2 id="incident-modal-title" className="dialog-title">
                {incident.title}
              </h2>
            </div>
            <button
              type="button"
              className="dialog-close"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close incident details"
            >
              ×
            </button>
          </header>

          <div className="dialog-body">
            <div className="dialog-specs">
              <div className="spec-item">
                <span className="spec-label">Sector</span>
                <span className="spec-value">{incident.sector}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Affected Systems</span>
                <span className="spec-value">{incident.affected}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">
                  {incident.type === 'crash' ? 'Root Cause' : 'Attack Vector'}
                </span>
                <span className="spec-value">{incident.vectorOrCause}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Scale &amp; Impact</span>
                <span className="spec-value">{incident.impact}</span>
              </div>
              {incident.cveOrRef && (
                <div className="spec-item">
                  <span className="spec-label">Identifier / CVE</span>
                  <span className="spec-value" style={{ fontFamily: 'var(--font-mono)' }}>
                    {incident.cveOrRef}
                  </span>
                </div>
              )}
            </div>

            <section>
              <h3 className="dialog-section-title">Overview</h3>
              <p className="dialog-prose">{incident.summary}</p>
            </section>

            <section>
              <h3 className="dialog-section-title">Technical Postmortem</h3>
              <p className="dialog-prose">{incident.postmortem}</p>
            </section>

            <section>
              <h3 className="dialog-section-title">Engineering Takeaways &amp; Prevention</h3>
              <div className="lesson-pills">
                {deriveLessons(incident).map((lesson) => (
                  <span key={lesson} className="lesson-pill">
                    {lesson}
                  </span>
                ))}
              </div>
            </section>

            {incident.sources && incident.sources.length > 0 && (
              <section>
                <h3 className="dialog-section-title">Verified Sources</h3>
                <ul style={{ margin: 0, paddingInlineStart: '1.2rem' }}>
                  {incident.sources.map((url) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <footer className="dialog-footer">
            <button
              type="button"
              className="dialog-nav-btn"
              onClick={onPrev}
              disabled={!hasPrev}
            >
              ← Previous
            </button>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button type="button" className="dialog-nav-btn" onClick={handleCopyLink}>
                {copied ? '✓ Link copied' : 'Copy link'}
              </button>
              <button
                type="button"
                className="dialog-nav-btn"
                onClick={() => dialogRef.current?.close()}
              >
                Close (Esc)
              </button>
            </div>
            <button
              type="button"
              className="dialog-nav-btn"
              onClick={onNext}
              disabled={!hasNext}
            >
              Next →
            </button>
          </footer>
        </>
      )}
    </dialog>
  );
}

