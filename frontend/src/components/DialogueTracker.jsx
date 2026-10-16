import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  MessageSquare, 
  Play, 
  Volume2, 
  Clock, 
  User, 
  Search, 
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  LocateFixed,
  Radio
} from 'lucide-react';
import { formatDisplayTime, formatPreciseTime } from '../utils/timeUtils';

export function DialogueTracker({
  segments = [],
  currentTime = 0,
  onSeek,
  onUpdateText,
  isRtl = false,
  languageName = 'Spoken Language',
  activeTrack = 'original',
  translations = {},
  onSwitchTrack
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef(null);
  const activeDialogueRef = useRef(null);
  const lastActiveIdRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // Find active segment with gap bridging
  const activeSegmentIndex = (() => {
    if (!segments || segments.length === 0) return -1;
    let idx = segments.findIndex(
      seg => currentTime >= parseFloat(seg.start) && currentTime <= parseFloat(seg.end)
    );
    if (idx === -1) {
      idx = segments.findIndex(
        seg => currentTime >= parseFloat(seg.end) && currentTime <= (parseFloat(seg.end) + 0.35)
      );
    }
    return idx;
  })();
  const activeSegment = activeSegmentIndex !== -1 ? segments[activeSegmentIndex] : null;
  const nextSegment = activeSegmentIndex !== -1 && activeSegmentIndex + 1 < segments.length 
    ? segments[activeSegmentIndex + 1] 
    : null;

  // Calculate percentage of progress through the current dialogue
  let dialogueProgress = 0;
  if (activeSegment) {
    const totalSegTime = Math.max(0.01, activeSegment.end - activeSegment.start);
    const elapsed = Math.max(0, currentTime - activeSegment.start);
    dialogueProgress = Math.min(100, Math.max(0, (elapsed / totalSegTime) * 100));
  }

  const scrollToActive = useCallback((force = false) => {
    if (!activeDialogueRef.current || !containerRef.current) return;
    if (isUserScrollingRef.current && !force) return;

    const container = containerRef.current;
    const element = activeDialogueRef.current;

    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const distFromCenter = Math.abs(
      (elementRect.top + elementRect.height / 2) - (containerRect.top + containerRect.height / 2)
    );

    if (distFromCenter > 30 || force) {
      const offset = (elementRect.top - containerRect.top) - (containerRect.height / 2) + (elementRect.height / 2);
      container.scrollBy({ top: offset, behavior: 'smooth' });
    }
  }, []);

  // Auto-scroll when active dialogue changes
  useEffect(() => {
    if (!autoScroll || !activeSegment || isUserScrollingRef.current) return;

    if (activeSegment.id !== lastActiveIdRef.current) {
      lastActiveIdRef.current = activeSegment.id;
      scrollToActive();
    }
  }, [activeSegment?.id, autoScroll, scrollToActive]);

  const handleWheel = () => {
    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      if (autoScroll) scrollToActive();
    }, 1800);
  };

  const filteredSegments = segments.filter(seg => 
    !searchQuery || seg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 1. Live Dialogue HUD Tracker (Top Banner) */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(14, 20, 36, 0.95) 0%, rgba(9, 13, 24, 0.95) 100%)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: activeSegment ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: activeSegment ? '#06b6d4' : 'var(--text-muted)'
            }}>
              <Volume2 size={16} />
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Live Dialogue Tracking
            </span>
            {activeSegment && (
              <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#22d3ee',
                  display: 'inline-block',
                  marginRight: '4px',
                  boxShadow: '0 0 8px #22d3ee'
                }} />
                Speaking Now
              </span>
            )}
            {activeTrack && activeTrack !== 'original' && (
              <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                {translations[activeTrack]?.name || activeTrack.toUpperCase()}
              </span>
            )}
          </div>

          {/* Animated voice activity equalizer bars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '16px' }}>
            {[0.4, 0.8, 0.3, 0.9, 0.6].map((h, i) => (
              <span
                key={i}
                style={{
                  width: '3px',
                  height: activeSegment ? `${h * 16}px` : '4px',
                  background: activeSegment ? '#06b6d4' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '2px',
                  transition: 'height 0.2s ease',
                  boxShadow: activeSegment ? '0 0 6px rgba(6, 182, 212, 0.5)' : 'none'
                }}
              />
            ))}
          </div>
        </div>

        {/* Current Active Spoken Text Box */}
        <div style={{
          background: activeSegment ? 'rgba(99, 102, 241, 0.12)' : 'rgba(0, 0, 0, 0.3)',
          border: `1px solid ${activeSegment ? 'var(--primary)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          boxShadow: activeSegment ? '0 0 20px rgba(99, 102, 241, 0.25)' : 'none',
          transition: 'all 0.2s ease'
        }}>
          {activeSegment ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.76rem', color: '#a5b4fc' }}>
                <span style={{ fontWeight: 600 }}>
                  Dialogue #{activeSegmentIndex + 1}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {formatPreciseTime(activeSegment.start)} - {formatPreciseTime(activeSegment.end)}
                </span>
              </div>
              <div style={{
                fontFamily: isRtl ? 'Tahoma, Arial' : 'inherit',
                direction: isRtl ? 'rtl' : 'ltr',
                fontSize: '1.05rem',
                fontWeight: 600,
                color: '#ffffff',
                lineHeight: 1.5,
                wordBreak: 'break-word'
              }}>
                {(() => {
                  const rawText = activeSegment.text || '';
                  const words = rawText.split(' ');
                  if (words.length <= 1) return rawText;
                  const segDur = Math.max(0.01, activeSegment.end - activeSegment.start);
                  const elapsed = Math.max(0, currentTime - activeSegment.start);
                  const ratio = Math.min(1, elapsed / segDur);
                  const activeWordIdx = Math.min(words.length - 1, Math.floor(ratio * words.length));

                  return words.map((w, wIdx) => {
                    const isCurrentWord = wIdx === activeWordIdx;
                    return (
                      <span
                        key={wIdx}
                        style={{
                          margin: '0 3px',
                          display: 'inline-block',
                          color: isCurrentWord ? '#22d3ee' : '#ffffff',
                          background: isCurrentWord ? 'rgba(34, 211, 238, 0.2)' : 'transparent',
                          borderRadius: '4px',
                          padding: isCurrentWord ? '0 4px' : '0',
                          boxShadow: isCurrentWord ? '0 0 10px rgba(34, 211, 238, 0.4)' : 'none',
                          transform: isCurrentWord ? 'scale(1.04)' : 'scale(1)',
                          transition: 'all 0.08s ease'
                        }}
                      >
                        {w}
                      </span>
                    );
                  });
                })()}
              </div>

              {/* Progress bar inside active segment */}
              <div style={{
                width: '100%',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '999px',
                marginTop: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${dialogueProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                  transition: 'width 0.1s linear'
                }} />
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', textAlign: 'center', padding: '6px 0' }}>
              No dialogue speech at current playhead position ({formatDisplayTime(currentTime)})
            </div>
          )}
        </div>

        {/* Upcoming dialogue hint */}
        {nextSegment && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            padding: '2px 4px'
          }}>
            <span style={{ color: '#06b6d4', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              Next <ArrowRight size={12} />
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {nextSegment.text}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
              {formatDisplayTime(nextSegment.start)}
            </span>
          </div>
        )}
      </div>

      {/* 2. Search & Auto-scroll controls */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
          <input
            type="text"
            placeholder="Search dialogue phrases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 32px',
              borderRadius: '6px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '0.84rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => {
              setAutoScroll(true);
              isUserScrollingRef.current = false;
              scrollToActive(true);
            }}
            className="btn btn-soft-cyan"
            style={{
              fontSize: '0.78rem',
              padding: '6px 10px',
              gap: '5px'
            }}
            title="Snap immediately to currently spoken dialogue"
          >
            <LocateFixed size={13} color="#22d3ee" />
            <span>Snap to Speech</span>
          </button>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`btn ${autoScroll ? 'btn-soft-emerald' : 'btn-soft-amber'}`}
            style={{
              fontSize: '0.78rem',
              padding: '6px 10px',
              gap: '5px'
            }}
            title={autoScroll ? 'Auto-scroll is following video speech' : 'Auto-scroll paused'}
          >
            {autoScroll ? <Eye size={13} color="#34d399" /> : <EyeOff size={13} color="#fbbf24" />}
            <span>{autoScroll ? 'Auto-Track: ON' : 'Auto-Track: OFF'}</span>
          </button>
        </div>
      </div>

      {/* 3. Continuous Dialogue Script Stream (Conversational Layout) */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onTouchMove={handleWheel}
        style={{
          flex: 1,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          scrollBehavior: 'smooth',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {filteredSegments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            No dialogue matches found.
          </div>
        ) : (
          filteredSegments.map((seg, idx) => {
            const isActive = currentTime >= seg.start && currentTime <= seg.end;
            const speakerNum = (idx % 2 === 0) ? 1 : 2;

            return (
              <div
                key={seg.id || idx}
                ref={isActive ? activeDialogueRef : null}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive 
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(6, 182, 212, 0.12) 100%)' 
                    : 'rgba(18, 26, 43, 0.55)',
                  border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  boxShadow: isActive ? '0 4px 20px rgba(99, 102, 241, 0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Speaker avatar / icon */}
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: isActive 
                    ? 'linear-gradient(135deg, #6366f1, #06b6d4)' 
                    : (speakerNum === 1 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                  color: isActive ? '#fff' : (speakerNum === 1 ? '#a5b4fc' : '#6ee7b7'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  {speakerNum === 1 ? 'S1' : 'S2'}
                </div>

                {/* Content body */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {/* Top metadata */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: isActive ? '#67e8f9' : 'var(--text-secondary)'
                      }}>
                        Speaker {speakerNum}
                      </span>
                      <span style={{
                        fontSize: '0.74rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)'
                      }}>
                        {formatPreciseTime(seg.start)} - {formatPreciseTime(seg.end)}
                      </span>
                    </div>

                    {/* Quick Seek / Play Button */}
                    <button
                      onClick={() => onSeek(seg.start, true)}
                      style={{
                        background: isActive ? 'linear-gradient(135deg, #06b6d4, #6366f1)' : 'rgba(6, 182, 212, 0.12)',
                        border: `1px solid ${isActive ? '#22d3ee' : 'rgba(6, 182, 212, 0.3)'}`,
                        borderRadius: '6px',
                        color: isActive ? '#000000' : '#22d3ee',
                        width: '26px',
                        height: '26px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Jump video to this dialogue line"
                    >
                      <Play size={11} fill={isActive ? '#000000' : 'currentColor'} />
                    </button>
                  </div>

                  {/* Dialogue text */}
                  <div
                    dir={isRtl ? 'rtl' : 'ltr'}
                    style={{
                      fontFamily: isRtl ? 'Tahoma, Arial' : 'inherit',
                      fontSize: '0.94rem',
                      lineHeight: 1.5,
                      color: isActive ? '#ffffff' : 'var(--text-main)',
                      fontWeight: isActive ? 600 : 400
                    }}
                  >
                    {seg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
