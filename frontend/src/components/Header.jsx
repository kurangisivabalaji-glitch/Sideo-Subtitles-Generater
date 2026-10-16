import React from 'react';
import { Sparkles, Globe, Film, RefreshCw, Layers } from 'lucide-react';

export function Header({ hasVideo, onReset, activeTrack, detectedLanguage, confidence }) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 28px',
      borderBottom: '1px solid rgba(6, 182, 212, 0.25)',
      background: 'linear-gradient(180deg, rgba(11, 16, 27, 0.95) 0%, rgba(8, 12, 20, 0.92) 100%)',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 4px 25px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(6, 182, 212, 0.15)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #a855f7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 24px rgba(6, 182, 212, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <Film size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.28rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #38bdf8 0%, #a5b4fc 50%, #e879f9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>
              Universal AI Subtitle Studio
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 9px',
              borderRadius: '9999px',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              color: '#67e8f9',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              boxShadow: '0 0 10px rgba(6, 182, 212, 0.25)'
            }}>
              <Sparkles size={11} color="#22d3ee" /> Live AI Engine
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Whisper Speech Recognition • 99+ Languages • Sync Editor • Burn-in Export
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {detectedLanguage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            fontSize: '0.82rem',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.2)'
          }}>
            <Globe size={14} color="#06b6d4" />
            <span style={{ color: '#67e8f9', fontWeight: 700 }}>
              Spoken: {detectedLanguage}
            </span>
            {confidence && (
              <span style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 600 }}>
                ({Math.round(confidence * 100)}% match)
              </span>
            )}
          </div>
        )}

        {hasVideo && (
          <button
            onClick={onReset}
            className="btn btn-amber"
            style={{ fontSize: '0.82rem', padding: '7px 16px', fontWeight: 700, boxShadow: '0 0 15px rgba(245, 158, 11, 0.35)' }}
            title="Upload a new video"
          >
            <RefreshCw size={14} color="#000000" /> <span>Upload New Video</span>
          </button>
        )}
      </div>
    </header>
  );
}
