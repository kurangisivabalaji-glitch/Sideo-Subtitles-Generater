import React from 'react';
import { Loader2, Sparkles, AlertCircle, X, Zap } from 'lucide-react';

export function ProgressModal({ isOpen, step, progress, error, onCancel, onFastTrack }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(4, 7, 14, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '36px',
        textAlign: 'center',
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
      }}>
        {/* Close X button */}
        {onCancel && (
          <button
            onClick={onCancel}
            type="button"
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        )}

        {error ? (
          <div>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              color: '#fda4af'
            }}>
              <AlertCircle size={32} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '10px' }}>
              Processing Failed
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '24px', lineHeight: 1.6 }}>
              {error}
            </p>
            <button onClick={onCancel} className="btn btn-rose" style={{ width: '100%' }}>
              Close &amp; Try Again
            </button>
          </div>
        ) : (
          <div>
            {/* Glowing animated pulse icon */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto',
              color: '#67e8f9'
            }} className="animate-pulse-glow">
              <Sparkles size={36} className="animate-spin" style={{ animationDuration: '4s' }} />
            </div>

            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
              Generating AI Subtitles
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '24px' }}>
              {step || 'Processing video audio...'}
            </p>

            {/* Progress bar */}
            <div style={{
              width: '100%',
              height: '10px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
              marginBottom: '12px',
              position: 'relative'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 100%)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.4s ease',
                boxShadow: '0 0 12px rgba(6, 182, 212, 0.6)'
              }} />
            </div>

            {/* Percentage text */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              marginBottom: '18px'
            }}>
              <span>Speech Recognition in Progress</span>
              <span style={{ fontWeight: 600, color: '#a5b4fc' }}>{progress}%</span>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: onFastTrack ? '16px' : '0' }}>
              Whisper automatically recognizes speech phonetics, punctuation, and native scripts.
            </p>

            {/* Instant Fast Track Button */}
            {onFastTrack && (
              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <button
                  onClick={onFastTrack}
                  type="button"
                  className="btn btn-soft-cyan"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <Zap size={16} color="#06b6d4" />
                  Fast-Track to Studio (Instant)
                </button>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Skip waiting and enter the subtitle studio right away with acoustic cadence.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
