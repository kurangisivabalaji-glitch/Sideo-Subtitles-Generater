import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Subtitles, 
  Gauge,
  LocateFixed,
  Radio
} from 'lucide-react';
import { formatDisplayTime, formatPreciseTime } from '../utils/timeUtils';

function formatVttTimestamp(seconds) {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const totalMs = Math.floor(seconds * 1000);
  const hrs = Math.floor(totalMs / 3600000);
  const mins = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export function VideoPlayer({ 
  videoSrc, 
  segments = [], 
  currentTime, 
  onTimeUpdate, 
  styleOptions,
  videoRef,
  burnedVideoSrc = null
}) {
  const containerRef = useRef(null);
  const videoViewportRef = useRef(null);
  const animFrameRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [autoTracking, setAutoTracking] = useState(true);
  const [vttBlobUrl, setVttBlobUrl] = useState(null);
  const [inVideoPosition, setInVideoPosition] = useState(styleOptions?.position || 'bottom');

  // Generate native WebVTT track
  useEffect(() => {
    if (!segments || segments.length === 0) {
      setVttBlobUrl(null);
      return;
    }

    let vttContent = "WEBVTT\n\n";
    segments.forEach((seg, idx) => {
      const start = formatVttTimestamp(seg.start);
      const end = formatVttTimestamp(seg.end);
      const text = (seg.text || '').trim();
      vttContent += `${idx + 1}\n${start} --> ${end}\n${text}\n\n`;
    });

    const blob = new Blob([vttContent], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    setVttBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [segments]);

  // High-frequency auto-tracking loop when video is playing
  useEffect(() => {
    let lastReportedTime = -1;

    const trackLoop = () => {
      if (videoRef.current && !videoRef.current.paused) {
        const curTime = videoRef.current.currentTime;
        // Fire update smoothly every ~50ms (20fps) to avoid React root thrashing
        if (Math.abs(curTime - lastReportedTime) >= 0.05 || lastReportedTime === -1) {
          lastReportedTime = curTime;
          onTimeUpdate(curTime);
        }
        animFrameRef.current = requestAnimationFrame(trackLoop);
      }
    };

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(trackLoop);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, onTimeUpdate, videoRef]);

  // Derive active segment directly and synchronously during render (ZERO delay, instant 60fps tracking)
  const activeSegmentData = (() => {
    if (!segments || segments.length === 0 || !autoTracking) {
      return { segment: null, index: -1 };
    }

    const time = currentTime;
    // 1. Direct timestamp match
    let idx = segments.findIndex(seg => {
      const s = parseFloat(seg.start);
      const e = parseFloat(seg.end);
      return time >= s && time <= e;
    });

    // 2. Small gap hold (< 0.4s) to prevent flicker between speech pauses
    if (idx === -1) {
      idx = segments.findIndex(seg => {
        const e = parseFloat(seg.end);
        return time >= e && time <= (e + 0.4);
      });
    }

    // 3. At start of video (within 1s before segment 0), display segment 0 ready
    if (idx === -1 && segments.length > 0 && time <= parseFloat(segments[0].start) && parseFloat(segments[0].start) - time <= 1.0) {
      idx = 0;
    }

    if (idx !== -1) {
      return { segment: segments[idx], index: idx };
    }
    return { segment: null, index: -1 };
  })();

  const activeSegment = activeSegmentData.segment;
  const activeSegmentIndex = activeSegmentData.index;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const seekTime = parseFloat(e.target.value);
    videoRef.current.currentTime = seekTime;
    onTimeUpdate(seekTime);
  };

  const handleSkip = (seconds) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
    videoRef.current.currentTime = newTime;
    onTimeUpdate(newTime);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  const handleSpeedChange = (speed) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-3);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkip(3);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration, isPlaying]);

  // Compute In-Video Subtitle Styles (Strictly NO black background by default)
  const fontFam = styleOptions?.fontFamily || 'Outfit, Arial, sans-serif';
  const fontSz = styleOptions?.fontSize || 24;
  const txtColor = styleOptions?.textColor || '#ffffff';
  const currentPos = inVideoPosition || styleOptions?.position || 'bottom';

  // Subtitle position strictly relative to the video screen
  let posStyle = { bottom: '7%' };
  if (currentPos === 'top') posStyle = { top: '8%' };
  if (currentPos === 'middle') posStyle = { top: '50%', transform: 'translateY(-50%)' };

  // Background is transparent (no black box), with high-contrast text-shadow
  const bgCss = styleOptions?.bgStyle === 'box' 
    ? `rgba(0, 0, 0, ${styleOptions.bgOpacity || 0.7})` 
    : 'transparent';

  const textShadowCss = `
    -2px -2px 0 #000000,  
     2px -2px 0 #000000,
    -2px  2px 0 #000000,
     2px  2px 0 #000000,
     0px  2px 6px rgba(0, 0, 0, 0.95),
     0px  4px 12px rgba(0, 0, 0, 0.85)
  `;

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: '#000000',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.85)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 1. DEDICATED VIDEO SCREEN VIEWPORT (Subtitles strictly live INSIDE this box) */}
      <div 
        ref={videoViewportRef}
        style={{
          position: 'relative',
          width: '100%',
          background: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          minHeight: '260px'
        }}
      >
        {/* Top inside-video HUD bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '10px 14px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 25,
          pointerEvents: 'auto'
        }}>
          {/* Active dialogue indicator badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setAutoTracking(!autoTracking)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                background: autoTracking ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                border: `1px solid ${autoTracking ? 'rgba(16, 185, 129, 0.6)' : 'rgba(245, 158, 11, 0.6)'}`,
                color: autoTracking ? '#6ee7b7' : '#fcd34d',
                fontSize: '0.74rem',
                fontWeight: 700,
                backdropFilter: 'blur(8px)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={autoTracking ? 'Click to pause auto-tracking' : 'Click to enable auto-tracking'}
            >
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: autoTracking ? '#10b981' : '#f59e0b',
                boxShadow: autoTracking ? '0 0 10px #10b981' : 'none'
              }} />
              {autoTracking ? 'Auto-Tracking: ON' : 'Auto-Tracking: PAUSED'}
            </button>

            {activeSegment ? (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(6, 182, 212, 0.25)',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                color: '#67e8f9',
                fontSize: '0.74rem',
                fontWeight: 700,
                backdropFilter: 'blur(8px)'
              }}>
                <Radio size={12} color="#22d3ee" />
                Dialogue #{activeSegmentIndex + 1} ({formatPreciseTime(currentTime)})
              </div>
            ) : (
              <div style={{
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.5)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.72rem'
              }}>
                Subtitles Ready
              </div>
            )}
          </div>

          {/* In-video Position Switcher (Bottom, Middle, Top) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginRight: '2px' }}>
              Position:
            </span>
            {[
              { id: 'bottom', label: 'Bottom', activeBg: '#10b981', idleBg: 'rgba(16, 185, 129, 0.15)', idleBorder: 'rgba(16, 185, 129, 0.4)', text: '#6ee7b7' },
              { id: 'middle', label: 'Middle', activeBg: '#06b6d4', idleBg: 'rgba(6, 182, 212, 0.15)', idleBorder: 'rgba(6, 182, 212, 0.4)', text: '#67e8f9' },
              { id: 'top', label: 'Top', activeBg: '#f59e0b', idleBg: 'rgba(245, 158, 11, 0.15)', idleBorder: 'rgba(245, 158, 11, 0.4)', text: '#fcd34d' }
            ].map(pos => {
              const isCurrent = currentPos === pos.id;
              return (
                <button
                  key={pos.id}
                  onClick={() => setInVideoPosition(pos.id)}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    padding: '3px 9px',
                    borderRadius: '6px',
                    border: isCurrent ? `1.5px solid ${pos.activeBg}` : `1px solid ${pos.idleBorder}`,
                    background: isCurrent ? pos.activeBg : pos.idleBg,
                    color: isCurrent ? (pos.id === 'top' ? '#000000' : '#ffffff') : pos.text,
                    boxShadow: isCurrent ? `0 0 10px ${pos.activeBg}` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {pos.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Video Canvas or Live Speech Studio Visualizer */}
        {!videoSrc && !burnedVideoSrc ? (
          <div style={{
            width: '100%',
            height: '340px',
            background: 'radial-gradient(circle at center, #0f172a 0%, #030712 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            position: 'relative',
            borderBottom: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22d3ee',
              boxShadow: '0 0 25px rgba(6, 182, 212, 0.35)',
              animation: 'pulse 2s infinite'
            }}>
              <Radio size={32} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', display: 'block' }}>
                Live Speech &amp; Dialogue Auto-Tracker
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                Speak into your microphone below — subtitles auto-track and appear here in real time
              </span>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={burnedVideoSrc || videoSrc}
            playsInline
            crossOrigin="anonymous"
            style={{
              width: '100%',
              maxHeight: '520px',
              display: 'block',
              objectFit: 'contain',
              background: '#04060a'
            }}
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={() => {
              if (videoRef.current) {
                onTimeUpdate(videoRef.current.currentTime);
              }
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
              }
            }}
            onEnded={() => setIsPlaying(false)}
          >
            {vttBlobUrl && (
              <track
                kind="subtitles"
                label="AI Subtitles"
                src={vttBlobUrl}
                default={false}
              />
            )}
          </video>
        )}

        {/* SUBTITLES RENDERED STRICTLY INSIDE THE VIDEO FRAME WITH AUTO-TRACKING WORD HIGHLIGHT */}
        {showSubtitles && activeSegment && (
          <div style={{
            position: 'absolute',
            left: '5%',
            right: '5%',
            pointerEvents: 'none',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 20,
            ...posStyle
          }}>
            <div style={{
              fontFamily: fontFam,
              fontSize: `${fontSz}px`,
              color: txtColor,
              background: bgCss, // Transparent by default, NO black background!
              textShadow: textShadowCss, // Crisp outline legible over any scene
              padding: styleOptions?.bgStyle === 'box' ? '6px 16px' : '2px 6px',
              borderRadius: '6px',
              maxWidth: '92%',
              textAlign: 'center',
              lineHeight: 1.4,
              fontWeight: 700,
              letterSpacing: '0.01em',
              direction: styleOptions?.isRtl ? 'rtl' : 'ltr',
              wordBreak: 'break-word',
              whiteSpace: 'pre-line',
              transition: 'all 0.08s ease'
            }}>
              {(() => {
                const rawText = activeSegment.text || '';
                const words = rawText.split(' ');
                if (words.length <= 1) return rawText;

                // 1. Try exact word-level timestamp array from Whisper
                let activeWordIdx = -1;
                if (activeSegment.words && Array.isArray(activeSegment.words) && activeSegment.words.length > 0) {
                  activeWordIdx = activeSegment.words.findIndex(
                    w => currentTime >= parseFloat(w.start) && currentTime <= parseFloat(w.end)
                  );
                  if (activeWordIdx === -1) {
                    activeWordIdx = activeSegment.words.findIndex(
                      w => currentTime <= parseFloat(w.end)
                    );
                  }
                }

                // 2. Fallback to precise proportional time interpolation
                if (activeWordIdx === -1) {
                  const segDur = Math.max(0.01, activeSegment.end - activeSegment.start);
                  const elapsed = Math.max(0, currentTime - activeSegment.start);
                  const progressRatio = Math.min(1, elapsed / segDur);
                  activeWordIdx = Math.min(words.length - 1, Math.floor(progressRatio * words.length));
                }

                return words.map((w, wIdx) => {
                  const isCurrentWord = wIdx === activeWordIdx;
                  const isSpoken = wIdx < activeWordIdx;
                  return (
                    <span
                      key={wIdx}
                      style={{
                        margin: '0 3px',
                        display: 'inline-block',
                        color: isCurrentWord ? '#22d3ee' : txtColor,
                        opacity: isCurrentWord ? 1 : (isSpoken ? 1 : 0.88),
                        textShadow: isCurrentWord 
                          ? '0 0 14px rgba(34, 211, 238, 0.95), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000' 
                          : textShadowCss,
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
          </div>
        )}
      </div>

      {/* 2. CONTROLS BAR (Placed BELOW the video viewport so subtitles are never hidden or pushed) */}
      <div style={{
        background: 'linear-gradient(to top, rgba(4, 7, 14, 0.98) 0%, rgba(10, 15, 28, 0.95) 100%)',
        padding: '12px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Progress Scrubber */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.05"
            value={currentTime}
            onChange={handleSeek}
            style={{
              flex: 1,
              height: '5px',
              accentColor: 'var(--accent-cyan)',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          {/* Left: Playback buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={togglePlay}
              className="btn btn-cyan"
              style={{ width: '38px', height: '38px', padding: 0, borderRadius: '50%', boxShadow: '0 0 16px rgba(6, 182, 212, 0.5)' }}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause size={18} fill="#ffffff" /> : <Play size={18} fill="#ffffff" style={{ marginLeft: '2px' }} />}
            </button>

            <button
              onClick={() => handleSkip(-5)}
              className="btn btn-soft-cyan"
              style={{ width: '32px', height: '32px', padding: 0 }}
              title="Skip back 5s"
            >
              <RotateCcw size={15} />
            </button>

            <button
              onClick={() => handleSkip(5)}
              className="btn btn-soft-cyan"
              style={{ width: '32px', height: '32px', padding: 0 }}
              title="Skip forward 5s"
            >
              <RotateCw size={15} />
            </button>

            {/* Time display */}
            <span style={{ fontSize: '0.84rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginLeft: '6px' }}>
              {formatDisplayTime(currentTime)} / {formatDisplayTime(duration)}
            </span>
          </div>

          {/* Right: Volume, Speed, Auto-Tracking, Subtitle Inside Video toggle, Fullscreen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={toggleMute}
                className="btn btn-secondary"
                style={{ width: '30px', height: '30px', padding: 0, border: 'none', background: 'transparent' }}
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} color="#67e8f9" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{ width: '60px', height: '4px', accentColor: 'var(--primary)' }}
              />
            </div>

            {/* Speed dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Gauge size={14} color="#a5b4fc" />
              <select
                value={playbackRate}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
                  padding: '3px 6px',
                  cursor: 'pointer'
                }}
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                  <option key={speed} value={speed} style={{ background: '#0e1422' }}>
                    {speed}x
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-Tracking Toggle Button */}
            <button
              onClick={() => setAutoTracking(!autoTracking)}
              className={`btn ${autoTracking ? 'btn-soft-emerald' : 'btn-soft-amber'}`}
              style={{
                height: '32px',
                padding: '0 10px',
                gap: '5px',
                fontSize: '0.78rem'
              }}
              title={autoTracking ? 'Subtitles auto-tracking is ON' : 'Subtitles auto-tracking is PAUSED'}
            >
              <LocateFixed size={15} color={autoTracking ? '#34d399' : '#fbbf24'} />
              <span>{autoTracking ? 'Auto-Track ON' : 'Auto-Track OFF'}</span>
            </button>

            {/* Subtitles inside video toggle */}
            <button
              onClick={() => setShowSubtitles(!showSubtitles)}
              className={`btn ${showSubtitles ? 'btn-soft-emerald' : 'btn-soft-rose'}`}
              style={{
                height: '32px',
                padding: '0 10px',
                gap: '5px',
                fontSize: '0.78rem'
              }}
              title={showSubtitles ? 'Subtitles are ON inside video' : 'Subtitles are OFF inside video'}
            >
              <Subtitles size={15} color={showSubtitles ? '#34d399' : '#fda4af'} />
              <span>{showSubtitles ? 'Subtitles ON' : 'Subtitles OFF'}</span>
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="btn btn-soft-purple"
              style={{ width: '32px', height: '32px', padding: 0 }}
              title="Fullscreen"
            >
              <Maximize size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
