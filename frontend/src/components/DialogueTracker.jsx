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
  Radio,
  Globe,
  RotateCcw,
  Copy,
  Check,
  Edit2,
  CheckCircle2,
  Filter,
  Zap,
  Users,
  Plus,
  Trash2,
  Wand2
} from 'lucide-react';
import { formatDisplayTime, formatPreciseTime } from '../utils/timeUtils';
import { getLanguageDetails } from '../utils/languages';
import { fixAllSubtitleSegments, cleanAndFixSubtitleText } from '../utils/spellChecker';

export function DialogueTracker({
  segments = [],
  currentTime = 0,
  onSeek,
  onUpdateText,
  onUpdateAllSegments,
  onAddSegment,
  onDeleteSegment,
  onRenameSpeaker,
  isRtl = false,
  languageName = 'Spoken Language',
  activeTrack = 'original',
  translations = {},
  onSwitchTrack
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState('ALL');
  const [copiedScript, setCopiedScript] = useState(false);
  const [renamingSpeaker, setRenamingSpeaker] = useState(null); // 'Speaker 1' etc
  const [newSpeakerName, setNewSpeakerName] = useState('');

  const containerRef = useRef(null);
  const activeDialogueRef = useRef(null);
  const lastActiveIdRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // Context-aware dialogue resolver with intelligent gap bridging & upcoming preview
  const { activeSegment, activeSegmentIndex, nextSegment, isPauseGap, isBeforeSpeech, pauseDurationRemaining } = (() => {
    if (!segments || segments.length === 0) {
      return { activeSegment: null, activeSegmentIndex: -1, nextSegment: null, isPauseGap: false, isBeforeSpeech: false, pauseDurationRemaining: 0 };
    }

    // 1. Direct match within start and end
    let idx = segments.findIndex(
      seg => currentTime >= parseFloat(seg.start) && currentTime <= parseFloat(seg.end)
    );

    // 2. Playhead is before the very first segment
    if (idx === -1 && currentTime < parseFloat(segments[0].start)) {
      const waitTime = parseFloat((parseFloat(segments[0].start) - currentTime).toFixed(1));
      return {
        activeSegment: segments[0],
        activeSegmentIndex: 0,
        nextSegment: segments.length > 1 ? segments[1] : null,
        isPauseGap: false,
        isBeforeSpeech: true,
        pauseDurationRemaining: waitTime
      };
    }

    // 3. Playhead is within a gap between two segments
    if (idx === -1) {
      for (let i = 0; i < segments.length - 1; i++) {
        const segEnd = parseFloat(segments[i].end);
        const nextStart = parseFloat(segments[i + 1].start);
        if (currentTime >= segEnd && currentTime <= nextStart) {
          const waitTime = parseFloat((nextStart - currentTime).toFixed(1));
          return {
            activeSegment: segments[i],
            activeSegmentIndex: i,
            nextSegment: segments[i + 1],
            isPauseGap: true,
            isBeforeSpeech: false,
            pauseDurationRemaining: waitTime
          };
        }
      }
    }

    // 4. Playhead is past the last segment
    if (idx === -1 && currentTime > parseFloat(segments[segments.length - 1].end)) {
      const lastIdx = segments.length - 1;
      return {
        activeSegment: segments[lastIdx],
        activeSegmentIndex: lastIdx,
        nextSegment: null,
        isPauseGap: false,
        isBeforeSpeech: false,
        pauseDurationRemaining: 0
      };
    }

    // Direct active segment
    const curSeg = idx !== -1 ? segments[idx] : null;
    const nxtSeg = idx !== -1 && idx + 1 < segments.length ? segments[idx + 1] : null;

    return {
      activeSegment: curSeg,
      activeSegmentIndex: idx,
      nextSegment: nxtSeg,
      isPauseGap: false,
      isBeforeSpeech: false,
      pauseDurationRemaining: 0
    };
  })();

  // Calculate percentage of progress through the current dialogue
  let dialogueProgress = 0;
  if (activeSegment) {
    const totalSegTime = Math.max(0.01, activeSegment.end - activeSegment.start);
    const elapsed = Math.max(0, currentTime - activeSegment.start);
    dialogueProgress = Math.min(100, Math.max(0, (elapsed / totalSegTime) * 100));
  }

  // Smooth scroll to active dialogue card
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

  // Unique speakers list
  const uniqueSpeakers = Array.from(new Set(
    segments.map((s, i) => s.speaker || `Speaker ${i % 2 === 0 ? 1 : 2}`)
  ));

  // Filter segments
  const filteredSegments = segments.filter(seg => {
    const matchesSearch = !searchQuery || seg.text.toLowerCase().includes(searchQuery.toLowerCase());
    const segSpeaker = seg.speaker || (seg.id % 2 === 0 ? 'Speaker 2' : 'Speaker 1');
    const matchesSpeaker = speakerFilter === 'ALL' || segSpeaker === speakerFilter;
    return matchesSearch && matchesSpeaker;
  });

  // Start editing segment inline
  const handleStartEdit = (seg, e) => {
    if (e) e.stopPropagation();
    setEditingId(seg.id);
    setEditText(seg.text);
  };

  const [fixedSpellingNotice, setFixedSpellingNotice] = useState(false);

  // Save edited segment with spell & grammar cleanup
  const handleSaveEdit = (segId) => {
    if (onUpdateText && editText.trim()) {
      const cleaned = cleanAndFixSubtitleText(editText.trim(), languageName);
      onUpdateText(segId, cleaned);
    }
    setEditingId(null);
  };

  // One-click batch fix spelling across all dialogue subtitles
  const handleFixAllSpelling = () => {
    const fixed = fixAllSubtitleSegments(segments, languageName);
    if (onUpdateAllSegments) {
      onUpdateAllSegments(fixed);
    } else if (onUpdateText) {
      fixed.forEach(s => onUpdateText(s.id, s.text));
    }
    setFixedSpellingNotice(true);
    setTimeout(() => setFixedSpellingNotice(false), 2200);
  };

  // Copy full transcript
  const handleCopyScript = () => {
    const text = segments.map((s, i) => {
      const spk = s.speaker || `Speaker ${i % 2 === 0 ? 1 : 2}`;
      return `[${formatPreciseTime(s.start)} - ${formatPreciseTime(s.end)}] ${spk}:\n${s.text}\n`;
    }).join('\n');

    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2200);
  };

  // Save speaker rename
  const handleApplySpeakerRename = () => {
    if (renamingSpeaker && newSpeakerName.trim() && onRenameSpeaker) {
      onRenameSpeaker(renamingSpeaker, newSpeakerName.trim());
    }
    setRenamingSpeaker(null);
    setNewSpeakerName('');
  };

  // Add new dialogue subtitle at current playhead time
  const handleAddDialogueAtPlayhead = () => {
    if (!onAddSegment) return;
    const newId = (segments.length > 0 ? Math.max(...segments.map(s => Number(s.id) || 0)) : 0) + 1;
    const start = parseFloat(Number(currentTime).toFixed(2));
    const end = parseFloat(Number(currentTime + 2.5).toFixed(2));
    const speaker = segments.length % 2 === 0 ? 'Speaker 1' : 'Speaker 2';

    const newSeg = {
      id: newId,
      start,
      end,
      text: 'New spoken dialogue line...',
      speaker
    };

    onAddSegment(newSeg);
    setEditingId(newId);
    setEditText('New spoken dialogue line...');
  };

  // Delete dialogue segment
  const handleDeleteSegment = (segId, e) => {
    if (e) e.stopPropagation();
    if (onDeleteSegment) {
      onDeleteSegment(segId);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 1. Live Dialogue HUD Tracker (Top Banner) */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(14, 20, 36, 0.95) 0%, rgba(9, 13, 24, 0.95) 100%)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
              Live Dialogue Tracking
            </span>
            {languageName && (
              <span className="badge badge-cyan" style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Globe size={11} color="#06b6d4" />
                <span>{getLanguageDetails(languageName).displayLabel}</span>
              </span>
            )}
            {activeSegment ? (
              <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#34d399',
                  display: 'inline-block',
                  marginRight: '4px',
                  boxShadow: '0 0 8px #34d399'
                }} />
                Speaking Now
              </span>
            ) : (
              <span className="badge badge-slate" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Waiting for dialogue...
              </span>
            )}
            {activeTrack && activeTrack !== 'original' && (
              <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>
                {translations[activeTrack]?.name || activeTrack.toUpperCase()}
              </span>
            )}
          </div>

          {/* Dynamic Voice Activity Waveform Equalizer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '18px' }} title="Speech Audio Activity">
            {[0.3, 0.7, 0.9, 0.5, 0.8, 0.4, 0.6].map((h, i) => {
              const dynamicHeight = activeSegment 
                ? Math.max(5, Math.min(18, h * 18 * (0.8 + 0.35 * Math.sin((currentTime * 10) + i))))
                : 4;
              return (
                <span
                  key={i}
                  style={{
                    width: '3px',
                    height: `${dynamicHeight}px`,
                    background: activeSegment ? 'linear-gradient(to top, #6366f1, #06b6d4)' : 'rgba(255, 255, 255, 0.18)',
                    borderRadius: '2px',
                    transition: 'height 0.08s ease',
                    boxShadow: activeSegment ? '0 0 8px rgba(6, 182, 212, 0.6)' : 'none'
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Current Active Spoken Text Box */}
        <div style={{
          background: activeSegment ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.14) 0%, rgba(6, 182, 212, 0.10) 100%)' : 'rgba(0, 0, 0, 0.3)',
          border: `1px solid ${activeSegment ? 'var(--primary)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          boxShadow: activeSegment ? '0 0 24px rgba(99, 102, 241, 0.28)' : 'none',
          transition: 'all 0.2s ease'
        }}>
          {activeSegment ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.78rem', color: '#a5b4fc', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#67e8f9' }}>
                    {activeSegment.speaker || `Speaker ${activeSegmentIndex % 2 === 0 ? 1 : 2}`}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span>Dialogue #{activeSegmentIndex + 1} of {segments.length}</span>
                  {isBeforeSpeech && (
                    <span className="badge badge-cyan" style={{ fontSize: '0.68rem', padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      ▶️ Starts in {pauseDurationRemaining}s
                    </span>
                  )}
                  {isPauseGap && (
                    <span className="badge badge-purple" style={{ fontSize: '0.68rem', padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      ⏸️ Speech Pause ({pauseDurationRemaining}s)
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {formatPreciseTime(activeSegment.start)} - {formatPreciseTime(activeSegment.end)}
                  </span>
                  <button
                    onClick={() => onSeek(activeSegment.start, true)}
                    className="btn btn-soft-cyan"
                    style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px' }}
                    title={isBeforeSpeech ? "Start playback from opening speech" : "Replay this line"}
                  >
                    {isBeforeSpeech ? <Play size={11} fill="currentColor" /> : <RotateCcw size={11} />}
                    <span>{isBeforeSpeech ? 'Play' : 'Replay'}</span>
                  </button>
                  {isPauseGap && nextSegment && (
                    <button
                      onClick={() => onSeek(nextSegment.start, true)}
                      className="btn btn-soft-emerald"
                      style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px' }}
                      title="Skip pause to next dialogue line"
                    >
                      <span>Skip Pause ⏩</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Word-by-word karaoke tracking in HUD */}
              <div style={{
                fontFamily: isRtl ? 'Tahoma, Arial' : 'inherit',
                direction: isRtl ? 'rtl' : 'ltr',
                fontSize: '1.08rem',
                fontWeight: 600,
                color: '#ffffff',
                lineHeight: 1.55,
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
                          background: isCurrentWord ? 'rgba(34, 211, 238, 0.22)' : 'transparent',
                          borderRadius: '4px',
                          padding: isCurrentWord ? '0 5px' : '0',
                          boxShadow: isCurrentWord ? '0 0 12px rgba(34, 211, 238, 0.5)' : 'none',
                          transform: isCurrentWord ? 'scale(1.05)' : 'scale(1)',
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
                marginTop: '12px',
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
            <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
              ✨ No dialogue segments loaded. Click "Add Dialogue" or upload video with speech.
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

      {/* 2. Search, Filter & Controls Toolbar */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        background: 'rgba(0, 0, 0, 0.22)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              placeholder="Search dialogue lines..."
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

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Add Dialogue Line */}
            {onAddSegment && (
              <button
                onClick={handleAddDialogueAtPlayhead}
                className="btn btn-emerald"
                style={{ fontSize: '0.76rem', padding: '6px 12px', gap: '5px', fontWeight: 700 }}
                title="Add a new dialogue line at current playhead position"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Add Dialogue</span>
              </button>
            )}

            {/* Fix Spelling */}
            <button
              onClick={handleFixAllSpelling}
              className="btn btn-soft-amber"
              style={{ fontSize: '0.76rem', padding: '6px 11px', gap: '5px', fontWeight: 700 }}
              title="Auto-fix common spelling mistakes, technical terms, and punctuation"
            >
              <Wand2 size={13} color="#f59e0b" />
              <span>{fixedSpellingNotice ? '✓ Fixed Spelling!' : 'Fix Spelling'}</span>
            </button>

            {/* Copy Script */}
            <button
              onClick={handleCopyScript}
              className="btn btn-soft-cyan"
              style={{ fontSize: '0.76rem', padding: '6px 10px', gap: '5px' }}
              title="Copy dialogue transcript to clipboard"
            >
              {copiedScript ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
              <span>{copiedScript ? 'Copied!' : 'Copy Script'}</span>
            </button>

            {/* Snap to speech */}
            <button
              onClick={() => {
                setAutoScroll(true);
                isUserScrollingRef.current = false;
                scrollToActive(true);
              }}
              className="btn btn-soft-cyan"
              style={{ fontSize: '0.76rem', padding: '6px 10px', gap: '5px' }}
              title="Snap immediately to currently spoken dialogue"
            >
              <LocateFixed size={13} color="#22d3ee" />
              <span>Snap</span>
            </button>

            {/* Auto-Track toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`btn ${autoScroll ? 'btn-soft-emerald' : 'btn-soft-amber'}`}
              style={{ fontSize: '0.76rem', padding: '6px 10px', gap: '5px' }}
              title={autoScroll ? 'Auto-scroll is tracking dialogue' : 'Auto-scroll paused'}
            >
              {autoScroll ? <Eye size={13} color="#34d399" /> : <EyeOff size={13} color="#fbbf24" />}
              <span>{autoScroll ? 'Auto-Track: ON' : 'Paused'}</span>
            </button>
          </div>
        </div>

        {/* Speaker Filter Pills */}
        {uniqueSpeakers.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={11} /> Speaker:
            </span>
            <button
              onClick={() => setSpeakerFilter('ALL')}
              className={`btn ${speakerFilter === 'ALL' ? 'btn-cyan' : 'btn-soft-cyan'}`}
              style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}
            >
              All ({segments.length})
            </button>
            {uniqueSpeakers.map((spk) => (
              <button
                key={spk}
                onClick={() => setSpeakerFilter(spk)}
                className={`btn ${speakerFilter === spk ? 'btn-purple' : 'btn-soft-purple'}`}
                style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}
              >
                {spk}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Speaker Rename Modal / Popover */}
      {renamingSpeaker && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(99, 102, 241, 0.15)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <Users size={16} color="#a5b4fc" />
          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#e0e7ff' }}>
            Rename "{renamingSpeaker}":
          </span>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Alex, Host, Interviewer"
            value={newSpeakerName}
            onChange={(e) => setNewSpeakerName(e.target.value)}
            style={{ fontSize: '0.82rem', padding: '4px 10px', flex: 1, minWidth: '150px' }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApplySpeakerRename();
              if (e.key === 'Escape') setRenamingSpeaker(null);
            }}
          />
          <button
            onClick={handleApplySpeakerRename}
            className="btn btn-cyan"
            style={{ fontSize: '0.76rem', padding: '4px 12px' }}
          >
            Apply to All
          </button>
          <button
            onClick={() => setRenamingSpeaker(null)}
            className="btn btn-soft-rose"
            style={{ fontSize: '0.76rem', padding: '4px 10px' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* 3. Continuous Dialogue Script Stream (Conversational Layout with Live Word Illumination) */}
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
            const speakerLabel = seg.speaker || `Speaker ${(idx % 2 === 0) ? 1 : 2}`;
            const speakerCode = speakerLabel.includes('2') ? 'S2' : (speakerLabel.includes('1') ? 'S1' : speakerLabel.substring(0, 2).toUpperCase());
            const isEditing = editingId === seg.id;

            return (
              <div
                key={seg.id || idx}
                ref={isActive ? activeDialogueRef : null}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive 
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.20) 0%, rgba(6, 182, 212, 0.14) 100%)' 
                    : 'rgba(18, 26, 43, 0.55)',
                  border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  boxShadow: isActive ? '0 4px 24px rgba(99, 102, 241, 0.35)' : 'none',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                {/* Speaker avatar / icon */}
                <button
                  type="button"
                  onClick={() => {
                    setRenamingSpeaker(speakerLabel);
                    setNewSpeakerName(speakerLabel);
                  }}
                  title="Click to rename this speaker across dialogues"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isActive 
                      ? 'linear-gradient(135deg, #6366f1, #06b6d4)' 
                      : (speakerCode === 'S1' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                    color: isActive ? '#fff' : (speakerCode === 'S1' ? '#a5b4fc' : '#6ee7b7'),
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 0 12px rgba(6, 182, 212, 0.5)' : 'none'
                  }}
                >
                  {speakerCode}
                </button>

                {/* Content body */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Top metadata */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        onClick={() => {
                          setRenamingSpeaker(speakerLabel);
                          setNewSpeakerName(speakerLabel);
                        }}
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: isActive ? '#67e8f9' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                        title="Click to rename speaker"
                      >
                        {speakerLabel}
                      </span>
                      <span style={{
                        fontSize: '0.74rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)'
                      }}>
                        {formatPreciseTime(seg.start)} - {formatPreciseTime(seg.end)}
                      </span>
                    </div>

                    {/* Action buttons (Seek, Replay, Edit, Delete) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => handleStartEdit(seg)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '6px',
                          color: 'var(--text-muted)',
                          width: '26px',
                          height: '26px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Edit dialogue text"
                      >
                        <Edit2 size={11} />
                      </button>

                      {onDeleteSegment && (
                        <button
                          onClick={(e) => handleDeleteSegment(seg.id, e)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '6px',
                            color: '#f87171',
                            width: '26px',
                            height: '26px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          title="Delete dialogue subtitle"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}

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
                        title="Play from this dialogue"
                      >
                        <Play size={11} fill={isActive ? '#000000' : 'currentColor'} />
                      </button>
                    </div>
                  </div>

                  {/* Dialogue text / Inline Editor */}
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      <textarea
                        className="input-field"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={2}
                        dir={isRtl ? 'rtl' : 'ltr'}
                        spellCheck={true}
                        style={{
                          width: '100%',
                          fontSize: '0.94rem',
                          lineHeight: 1.5,
                          padding: '8px 10px',
                          fontFamily: isRtl ? 'Tahoma, Arial' : 'inherit'
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveEdit(seg.id);
                          }
                          if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditingId(null)}
                          className="btn btn-soft-rose"
                          style={{ fontSize: '0.74rem', padding: '3px 10px' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(seg.id)}
                          className="btn btn-cyan"
                          style={{ fontSize: '0.74rem', padding: '3px 12px' }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => onSeek(seg.start, true)}
                      dir={isRtl ? 'rtl' : 'ltr'}
                      style={{
                        fontFamily: isRtl ? 'Tahoma, Arial' : 'inherit',
                        fontSize: '0.96rem',
                        lineHeight: 1.55,
                        color: isActive ? '#ffffff' : 'var(--text-main)',
                        fontWeight: isActive ? 600 : 400,
                        cursor: 'pointer'
                      }}
                    >
                      {/* Live Karaoke Word Illumination inside the card */}
                      {isActive ? (() => {
                        const words = (seg.text || '').split(' ');
                        if (words.length <= 1) return seg.text;
                        const segDur = Math.max(0.01, seg.end - seg.start);
                        const elapsed = Math.max(0, currentTime - seg.start);
                        const ratio = Math.min(1, elapsed / segDur);
                        const activeWordIdx = Math.min(words.length - 1, Math.floor(ratio * words.length));

                        return words.map((w, wIdx) => {
                          const isCurrentWord = wIdx === activeWordIdx;
                          const isSpoken = wIdx < activeWordIdx;
                          return (
                            <span
                              key={wIdx}
                              style={{
                                margin: '0 2px',
                                display: 'inline-block',
                                color: isCurrentWord ? '#22d3ee' : (isSpoken ? '#e2e8f0' : 'rgba(255, 255, 255, 0.72)'),
                                fontWeight: isCurrentWord ? 700 : (isSpoken ? 600 : 400),
                                background: isCurrentWord ? 'rgba(34, 211, 238, 0.22)' : 'transparent',
                                borderRadius: '3px',
                                padding: isCurrentWord ? '0 4px' : '0',
                                boxShadow: isCurrentWord ? '0 0 10px rgba(34, 211, 238, 0.45)' : 'none',
                                transform: isCurrentWord ? 'scale(1.05)' : 'scale(1)',
                                transition: 'all 0.08s ease'
                              }}
                            >
                              {w}
                            </span>
                          );
                        });
                      })() : (
                        seg.text
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
