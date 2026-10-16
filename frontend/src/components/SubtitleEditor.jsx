import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Split, 
  Combine, 
  Play, 
  Search, 
  Clock, 
  Undo, 
  Redo, 
  ChevronRight,
  Eye,
  EyeOff,
  LocateFixed,
  Languages,
  Sparkles,
  Check
} from 'lucide-react';
import { formatPreciseTime, parsePreciseTime } from '../utils/timeUtils';

export function SubtitleEditor({
  segments,
  currentTime,
  onUpdateSegments,
  onSeek,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isRtl,
  onPerformTranslation,
  onOpenTranslateTab,
  activeTrack,
  onSwitchTrack,
  translations = {},
  originalLanguage
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftOffset, setShiftOffset] = useState('');
  const [showShiftInput, setShowShiftInput] = useState(false);
  const [showTranslateQuick, setShowTranslateQuick] = useState(false);
  const [quickTargetLang, setQuickTargetLang] = useState('te');
  const [isQuickTranslating, setIsQuickTranslating] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const activeItemRef = useRef(null);
  const listContainerRef = useRef(null);
  const lastActiveIdRef = useRef(null);
  const userScrollTimeoutRef = useRef(null);
  const isUserInteractingRef = useRef(false);

  // Filter segments by search query
  const filteredSegments = segments.filter(seg => 
    !searchQuery || seg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find currently active segment
  const activeSegment = segments.find(
    seg => currentTime >= seg.start && currentTime <= seg.end
  );
  const activeId = activeSegment ? activeSegment.id : null;

  // Gentle auto-scroll ONLY when active segment changes to a different line
  useEffect(() => {
    if (!autoScroll || !activeId || isUserInteractingRef.current) return;

    // Only scroll if active segment ID changed
    if (activeId !== lastActiveIdRef.current) {
      lastActiveIdRef.current = activeId;

      if (activeItemRef.current && listContainerRef.current) {
        const container = listContainerRef.current;
        const element = activeItemRef.current;

        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Check if element is already comfortably within visible bounds
        const isComfortablyVisible = (
          elementRect.top >= containerRect.top + 50 &&
          elementRect.bottom <= containerRect.bottom - 50
        );

        if (!isComfortablyVisible) {
          const currentScroll = container.scrollTop;
          const elementOffsetTop = element.offsetTop;
          const targetTop = elementOffsetTop - (container.clientHeight / 2) + (element.clientHeight / 2);

          container.scrollTo({
            top: Math.max(0, targetTop),
            behavior: 'smooth'
          });
        }
      }
    }
  }, [activeId, autoScroll]);

  // Detect user manual wheel or touch scroll to temporarily pause auto-scroll
  const handleUserScroll = () => {
    isUserInteractingRef.current = true;
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    // Resume auto-scroll 3.5 seconds after user stops manually scrolling
    userScrollTimeoutRef.current = setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 3500);
  };

  const handleTextChange = (id, newText) => {
    const updated = segments.map(seg => 
      seg.id === id ? { ...seg, text: newText } : seg
    );
    onUpdateSegments(updated);
  };

  const handleTimeChange = (id, field, valueStr) => {
    const seconds = parsePreciseTime(valueStr);
    const updated = segments.map(seg => {
      if (seg.id === id) {
        return { ...seg, [field]: seconds };
      }
      return seg;
    });
    onUpdateSegments(updated);
  };

  const handleDelete = (id) => {
    const updated = segments.filter(seg => seg.id !== id);
    onUpdateSegments(updated);
  };

  const handleAddAfter = (index) => {
    const prevSeg = segments[index];
    const newStart = prevSeg ? prevSeg.end + 0.1 : 0;
    const newEnd = newStart + 2.5;
    const newSeg = {
      id: Date.now(),
      start: parseFloat(newStart.toFixed(2)),
      end: parseFloat(newEnd.toFixed(2)),
      text: ''
    };
    const updated = [...segments];
    updated.splice(index + 1, 0, newSeg);
    onUpdateSegments(updated);
  };

  const handleAddAtPlayhead = () => {
    const start = parseFloat(currentTime.toFixed(2));
    const end = parseFloat((currentTime + 2.5).toFixed(2));
    const newSeg = {
      id: Date.now(),
      start,
      end,
      text: 'New subtitle text'
    };
    const updated = [...segments, newSeg].sort((a, b) => a.start - b.start);
    onUpdateSegments(updated);
  };

  const handleSplit = (index) => {
    const seg = segments[index];
    const midTime = parseFloat(((seg.start + seg.end) / 2).toFixed(2));
    const words = seg.text.split(' ');
    const half = Math.ceil(words.length / 2);
    const text1 = words.slice(0, half).join(' ');
    const text2 = words.slice(half).join(' ');

    const seg1 = { ...seg, end: midTime, text: text1 };
    const seg2 = { id: Date.now(), start: midTime, end: seg.end, text: text2 };

    const updated = [...segments];
    updated.splice(index, 1, seg1, seg2);
    onUpdateSegments(updated);
  };

  const handleMergeNext = (index) => {
    if (index >= segments.length - 1) return;
    const current = segments[index];
    const next = segments[index + 1];

    const merged = {
      ...current,
      end: next.end,
      text: `${current.text} ${next.text}`.trim()
    };

    const updated = [...segments];
    updated.splice(index, 2, merged);
    onUpdateSegments(updated);
  };

  const handleApplyShift = () => {
    const offset = parseFloat(shiftOffset);
    if (isNaN(offset) || offset === 0) return;

    const updated = segments.map(seg => ({
      ...seg,
      start: Math.max(0, parseFloat((seg.start + offset).toFixed(2))),
      end: Math.max(0.1, parseFloat((seg.end + offset).toFixed(2)))
    }));
    onUpdateSegments(updated);
    setShiftOffset('');
    setShowShiftInput(false);
  };

  // Jump to active segment immediately
  const handleJumpToActive = () => {
    isUserInteractingRef.current = false;
    if (activeItemRef.current && listContainerRef.current) {
      const container = listContainerRef.current;
      const element = activeItemRef.current;
      const targetTop = element.offsetTop - (container.clientHeight / 2) + (element.clientHeight / 2);
      container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }
  };

  const totalWords = segments.reduce((acc, s) => acc + (s.text ? s.text.trim().split(/\s+/).length : 0), 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Top Toolbar */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          background: 'rgba(0, 0, 0, 0.25)'
        }}>
          {/* Left actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleAddAtPlayhead}
              className="btn btn-emerald"
              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              title="Add segment at video playhead position"
            >
              <Plus size={15} strokeWidth={2.5} /> Add Line
            </button>

            <button
              onClick={() => setShowShiftInput(!showShiftInput)}
              className="btn btn-amber"
              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              title="Shift all subtitle timings"
            >
              <Clock size={15} /> Shift Timing
            </button>

            {/* Quick Translate Subtitles Button */}
            {onPerformTranslation && (
              <button
                onClick={() => setShowTranslateQuick(!showTranslateQuick)}
                className="btn btn-purple"
                style={{ fontSize: '0.82rem', padding: '6px 13px', fontWeight: 700 }}
                title="Convert subtitles to different languages"
              >
                <Languages size={15} /> Convert Language
              </button>
            )}

            {/* Auto-Scroll Toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`btn ${autoScroll ? 'btn-soft-cyan' : 'btn-soft-amber'}`}
              style={{
                fontSize: '0.82rem',
                padding: '6px 12px'
              }}
              title={autoScroll ? 'Auto-scroll is ON. Click to pause auto-scrolling.' : 'Auto-scroll is paused. Click to turn ON.'}
            >
              {autoScroll ? <Eye size={14} color="#22d3ee" /> : <EyeOff size={14} color="#fbbf24" />}
              <span>{autoScroll ? 'Auto-Scroll ON' : 'Auto-Scroll Paused'}</span>
            </button>

            {activeId && (
              <button
                onClick={handleJumpToActive}
                className="btn btn-cyan"
                style={{ width: '32px', height: '32px', padding: 0 }}
                title="Jump view to currently playing subtitle line"
              >
                <LocateFixed size={15} />
              </button>
            )}

            {/* Undo / Redo with color */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="btn btn-soft-purple"
                style={{ width: '32px', height: '32px', padding: 0 }}
                title="Undo change"
              >
                <Undo size={14} />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="btn btn-soft-purple"
                style={{ width: '32px', height: '32px', padding: 0 }}
                title="Redo change"
              >
                <Redo size={14} />
              </button>
            </div>
          </div>

          {/* Stats & Active Track info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeTrack && activeTrack !== 'original' && (
              <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                <Languages size={11} /> {translations[activeTrack]?.name || activeTrack.toUpperCase()}
              </span>
            )}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{segments.length}</span> lines •{' '}
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{totalWords}</span> words
            </div>
          </div>
        </div>

        {/* Quick Translate Bar (collapsible) */}
        {showTranslateQuick && (
          <div style={{
            padding: '10px 16px',
            background: 'rgba(168, 85, 247, 0.12)',
            borderBottom: '1px solid rgba(168, 85, 247, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c084fc' }}>
                Convert Subtitles To:
              </span>
              <select
                value={quickTargetLang}
                onChange={(e) => setQuickTargetLang(e.target.value)}
                className="select-field"
                style={{ padding: '5px 12px', fontSize: '0.82rem', minWidth: '180px' }}
              >
                {[
                  { code: 'te', label: 'తెలుగు (Telugu)' },
                  { code: 'hi', label: 'हिन्दी (Hindi)' },
                  { code: 'en', label: 'English' },
                  { code: 'es', label: 'Español (Spanish)' },
                  { code: 'ta', label: 'தமிழ் (Tamil)' },
                  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
                  { code: 'ml', label: 'മലയാളം (Malayalam)' },
                  { code: 'fr', label: 'Français (French)' },
                  { code: 'ar', label: 'العربية (Arabic)' },
                  { code: 'de', label: 'Deutsch (German)' },
                  { code: 'ja', label: '日本語 (Japanese)' },
                ].map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <button
                onClick={async () => {
                  if (!onPerformTranslation) return;
                  setIsQuickTranslating(true);
                  try {
                    await onPerformTranslation(quickTargetLang);
                    setShowTranslateQuick(false);
                  } catch (e) {
                    alert(`Translation failed: ${e.message}`);
                  } finally {
                    setIsQuickTranslating(false);
                  }
                }}
                disabled={isQuickTranslating}
                className="btn btn-purple"
                style={{ fontSize: '0.8rem', padding: '6px 14px', fontWeight: 700 }}
              >
                {isQuickTranslating ? 'Converting...' : 'Translate Now'}
              </button>
            </div>

            {onOpenTranslateTab && (
              <button
                onClick={onOpenTranslateTab}
                className="btn btn-soft-purple"
                style={{ fontSize: '0.78rem', padding: '5px 12px' }}
              >
                Full Translation Studio →
              </button>
            )}
          </div>
        )}

      {/* Shift Timing Bar (collapsible) */}
      {showShiftInput && (
        <div style={{
          padding: '10px 16px',
          background: 'rgba(99, 102, 241, 0.1)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '0.84rem', color: '#a5b4fc', fontWeight: 600 }}>
            Shift all subtitles:
          </span>
          <input
            type="number"
            step="0.1"
            placeholder="e.g. +0.5 or -0.5"
            value={shiftOffset}
            onChange={(e) => setShiftOffset(e.target.value)}
            style={{
              width: '120px',
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: '#fff',
              fontSize: '0.84rem'
            }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>seconds</span>
          <button
            onClick={handleApplyShift}
            className="btn btn-amber"
            style={{ fontSize: '0.78rem', padding: '4px 12px' }}
          >
            Apply Shift
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '9px' }} />
          <input
            type="text"
            placeholder="Search dialogue text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 12px 6px 34px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '0.84rem'
            }}
          />
        </div>
      </div>

      {/* Subtitles Scrollable List */}
      <div
        ref={listContainerRef}
        onWheel={handleUserScroll}
        onTouchMove={handleUserScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          scrollBehavior: 'smooth',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          position: 'relative'
        }}
      >
        {filteredSegments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            No subtitle segments found matching your search.
          </div>
        ) : (
          filteredSegments.map((seg, idx) => {
            const isActive = currentTime >= seg.start && currentTime <= seg.end;
            return (
              <div
                key={seg.id || idx}
                ref={isActive ? activeItemRef : null}
                style={{
                  background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'rgba(18, 26, 43, 0.65)',
                  border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  boxShadow: isActive ? '0 0 16px rgba(99, 102, 241, 0.35)' : 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease'
                }}
              >
                {/* Header row: ID, Timestamps, Play & Action icons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  {/* Left: Index badge & play button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      color: isActive ? '#67e8f9' : 'var(--text-muted)',
                      minWidth: '22px'
                    }}>
                      #{idx + 1}
                    </span>
                    <button
                      onClick={() => onSeek(seg.start)}
                      style={{
                        background: isActive ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(6, 182, 212, 0.12)',
                        border: `1px solid ${isActive ? '#22d3ee' : 'rgba(6, 182, 212, 0.3)'}`,
                        borderRadius: '6px',
                        color: isActive ? '#000000' : '#22d3ee',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: isActive ? '0 0 10px rgba(6, 182, 212, 0.5)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      title="Seek video to this subtitle"
                    >
                      <Play size={12} fill={isActive ? '#000000' : 'currentColor'} />
                    </button>
                  </div>

                  {/* Timestamps inputs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="text"
                      value={formatPreciseTime(seg.start)}
                      onChange={(e) => handleTimeChange(seg.id, 'start', e.target.value)}
                      style={{
                        width: '68px',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        color: '#67e8f9',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem',
                        textAlign: 'center'
                      }}
                      title="Start timestamp (MM:SS.ms)"
                    />
                    <ChevronRight size={12} color="var(--text-muted)" />
                    <input
                      type="text"
                      value={formatPreciseTime(seg.end)}
                      onChange={(e) => handleTimeChange(seg.id, 'end', e.target.value)}
                      style={{
                        width: '68px',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        color: '#67e8f9',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem',
                        textAlign: 'center'
                      }}
                      title="End timestamp (MM:SS.ms)"
                    />
                  </div>

                  {/* Row Action buttons with distinct vibrant colors */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => handleAddAfter(idx)}
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '6px',
                        color: '#34d399',
                        cursor: 'pointer',
                        padding: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      title="Add subtitle line after (Emerald)"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>

                    <button
                      onClick={() => handleSplit(idx)}
                      style={{
                        background: 'rgba(59, 130, 246, 0.12)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '6px',
                        color: '#60a5fa',
                        cursor: 'pointer',
                        padding: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      title="Split this subtitle into two (Blue)"
                    >
                      <Split size={13} />
                    </button>

                    {idx < segments.length - 1 && (
                      <button
                        onClick={() => handleMergeNext(idx)}
                        style={{
                          background: 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: '6px',
                          color: '#fbbf24',
                          cursor: 'pointer',
                          padding: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        title="Merge with next line (Amber)"
                      >
                        <Combine size={13} />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(seg.id)}
                      style={{
                        background: 'rgba(244, 63, 94, 0.12)',
                        border: '1px solid rgba(244, 63, 94, 0.3)',
                        borderRadius: '6px',
                        color: '#fb7185',
                        cursor: 'pointer',
                        padding: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      title="Delete line (Rose)"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Subtitle text input */}
                <textarea
                  value={seg.text}
                  onChange={(e) => handleTextChange(seg.id, e.target.value)}
                  dir={isRtl ? 'rtl' : 'ltr'}
                  rows={2}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    color: 'var(--text-main)',
                    fontSize: '0.92rem',
                    padding: '8px 10px',
                    fontFamily: isRtl ? 'Tahoma, Arial' : 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    lineHeight: 1.4
                  }}
                  placeholder="Enter subtitle dialogue..."
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
