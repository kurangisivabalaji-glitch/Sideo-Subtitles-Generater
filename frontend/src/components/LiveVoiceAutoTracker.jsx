import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Radio, 
  Volume2, 
  Sparkles, 
  Check, 
  Languages, 
  AlertCircle,
  Play,
  RotateCcw
} from 'lucide-react';
import { formatPreciseTime } from '../utils/timeUtils';

export function LiveVoiceAutoTracker({
  onAddSegment,
  currentTime = 0,
  videoRef,
  isRtl = false,
  detectedLanguage = 'en'
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [selectedLang, setSelectedLang] = useState('en-US');
  const [supported, setSupported] = useState(true);
  const [speechStartTime, setSpeechStartTime] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [lastSavedSegment, setLastSavedSegment] = useState(null);

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const animFrameRef = useRef(null);
  const isListeningRef = useRef(false);
  const sessionStartTimeRef = useRef(Date.now());
  const lastSentenceEndTimeRef = useRef(0);

  // Supported speech recognition languages
  const speechLanguages = [
    { code: 'en-US', label: 'English (US)' },
    { code: 'en-IN', label: 'English (India)' },
    { code: 'te-IN', label: 'Telugu (తెలుగు)' },
    { code: 'hi-IN', label: 'Hindi (हिन्दी)' },
    { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
    { code: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)' },
    { code: 'ml-IN', label: 'Malayalam (മലയാളം)' },
    { code: 'es-ES', label: 'Español (Spanish)' },
    { code: 'fr-FR', label: 'Français (French)' },
    { code: 'de-DE', label: 'Deutsch (German)' },
    { code: 'ar-SA', label: 'العربية (Arabic)' },
    { code: 'zh-CN', label: '中文 (Chinese)' },
    { code: 'ja-JP', label: '日本語 (Japanese)' }
  ];

  // Auto-detect default recognition language based on detectedLanguage prop
  useEffect(() => {
    if (detectedLanguage) {
      const lower = detectedLanguage.toLowerCase();
      if (lower.includes('telugu') || lower === 'te') setSelectedLang('te-IN');
      else if (lower.includes('hindi') || lower === 'hi') setSelectedLang('hi-IN');
      else if (lower.includes('tamil') || lower === 'ta') setSelectedLang('ta-IN');
      else if (lower.includes('spanish') || lower === 'es') setSelectedLang('es-ES');
      else if (lower.includes('french') || lower === 'fr') setSelectedLang('fr-FR');
      else if (lower.includes('german') || lower === 'de') setSelectedLang('de-DE');
      else if (lower.includes('arabic') || lower === 'ar') setSelectedLang('ar-SA');
      else setSelectedLang('en-US');
    }
  }, [detectedLanguage]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {}
      stopAudioVisualizer();
    };
  }, []);

  const startAudioVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!isListeningRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.warn('Microphone stream error:', err);
    }
  };

  const stopAudioVisualizer = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) return;

    const recognition = recognitionRef.current;
    recognition.lang = selectedLang;

    sessionStartTimeRef.current = Date.now();
    lastSentenceEndTimeRef.current = (videoRef && videoRef.current && videoRef.current.currentTime > 0) 
      ? parseFloat(videoRef.current.currentTime.toFixed(2)) 
      : (currentTime || 0);

    const startTime = (videoRef && videoRef.current) 
      ? videoRef.current.currentTime 
      : currentTime;

    setSpeechStartTime(startTime);
    isListeningRef.current = true;
    setIsListening(true);
    setTranscript('');
    setInterimTranscript('');

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text + ' ';
        } else {
          interim += text;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      if (final.trim()) {
        const cleanedText = final.trim();
        setTranscript(prev => (prev ? prev + ' ' : '') + cleanedText);
        setInterimTranscript('');

        // Calculate segment timing synchronized to video playhead or live speech timeline
        const isVideoPlaying = videoRef && videoRef.current && !videoRef.current.paused;
        let segStart = 0;
        let segEnd = 1.2;

        if (isVideoPlaying) {
          const videoCurrent = videoRef.current.currentTime;
          segStart = parseFloat((speechStartTime !== null ? speechStartTime : Math.max(0, videoCurrent - 2.0)).toFixed(2));
          segEnd = parseFloat((Math.max(segStart + 1.0, videoCurrent)).toFixed(2));
          setSpeechStartTime(videoCurrent);
        } else {
          const elapsedSec = parseFloat(((Date.now() - sessionStartTimeRef.current) / 1000).toFixed(2));
          segStart = lastSentenceEndTimeRef.current;
          segEnd = Math.max(segStart + 1.2, elapsedSec);
          lastSentenceEndTimeRef.current = parseFloat((segEnd + 0.15).toFixed(2));
          setSpeechStartTime(lastSentenceEndTimeRef.current);
        }

        const newSeg = {
          id: Date.now(),
          start: Math.max(0, segStart),
          end: segEnd,
          text: cleanedText
        };

        if (onAddSegment) {
          onAddSegment(newSeg);
          setLastSavedSegment(newSeg);
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition status:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        stopListening();
        alert('Microphone permission denied. Please allow microphone access in your browser to auto-track spoken subtitles.');
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        // Auto-restart if user hasn't explicitly stopped
        try {
          recognition.start();
        } catch (e) {}
      } else {
        setIsListening(false);
        stopAudioVisualizer();
      }
    };

    try {
      recognition.start();
      startAudioVisualizer();
    } catch (e) {
      console.warn('Recognition start error:', e);
    }
  };

  const stopListening = () => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    stopAudioVisualizer();
    setSpeechStartTime(null);
  };

  if (!supported) {
    return null;
  }

  return (
    <div style={{
      background: isListening 
        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)' 
        : 'rgba(15, 23, 42, 0.85)',
      border: `1px solid ${isListening ? 'rgba(239, 68, 68, 0.6)' : 'var(--border-subtle)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      boxShadow: isListening ? '0 0 25px rgba(239, 68, 68, 0.3)' : 'none',
      transition: 'all 0.25s ease'
    }}>
      {/* Top Header Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: isListening ? '#ef4444' : 'rgba(99, 102, 241, 0.2)',
            color: '#ffffff',
            boxShadow: isListening ? '0 0 12px #ef4444' : 'none',
            animation: isListening ? 'pulse 1.5s infinite' : 'none'
          }}>
            <Mic size={15} />
          </span>
          <div>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
              Live Speech Auto-Tracker
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>
              Speak anything into your mic — auto-creates subtitles in real time
            </span>
          </div>
        </div>

        {/* Right action controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Language selector */}
          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            disabled={isListening}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: 'var(--text-main)',
              fontSize: '0.76rem',
              padding: '4px 8px',
              cursor: isListening ? 'not-allowed' : 'pointer'
            }}
            title="Speech recognition spoken language"
          >
            {speechLanguages.map(l => (
              <option key={l.code} value={l.code} style={{ background: '#0e1422' }}>
                {l.label}
              </option>
            ))}
          </select>

          {/* Toggle Live Speech Button */}
          <button
            onClick={toggleListening}
            className={`btn ${isListening ? 'btn-rose' : 'btn-cyan'}`}
            style={{
              fontSize: '0.8rem',
              padding: '6px 14px',
              fontWeight: 700,
              gap: '6px'
            }}
          >
            {isListening ? (
              <>
                <MicOff size={14} /> Stop Auto-Tracking
              </>
            ) : (
              <>
                <Mic size={14} /> Speak &amp; Auto-Track
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Voice Equalizer & Interim Text Stream */}
      {isListening && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '6px',
          padding: '10px 14px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {/* Animated voice frequency bars */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Radio size={13} color="#ef4444" />
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#fca5a5' }}>
                LISTENING LIVE — SPEAK NOW...
              </span>
            </div>

            {/* Audio Wave Bars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '14px' }}>
              {[0.3, 0.8, 0.4, 0.9, 0.6, 0.7, 0.5].map((scale, i) => (
                <span
                  key={i}
                  style={{
                    width: '3px',
                    height: `${Math.max(4, (audioLevel * scale * 0.25))}px`,
                    background: audioLevel > 15 ? '#ef4444' : '#6366f1',
                    borderRadius: '2px',
                    transition: 'height 0.1s ease',
                    boxShadow: audioLevel > 15 ? '0 0 6px #ef4444' : 'none'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Live recognized sentence */}
          <div style={{
            fontSize: '0.94rem',
            color: '#ffffff',
            fontWeight: 600,
            lineHeight: 1.4,
            minHeight: '24px'
          }}>
            {transcript && <span>{transcript} </span>}
            {interimTranscript && (
              <span style={{ color: '#22d3ee', textShadow: '0 0 8px rgba(34, 211, 238, 0.8)' }}>
                {interimTranscript}
              </span>
            )}
            {!transcript && !interimTranscript && (
              <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic', fontSize: '0.84rem' }}>
                Start speaking anything... words will automatically convert into synchronized subtitles.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Confirmation of last saved subtitle line */}
      {lastSavedSegment && !isListening && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.76rem',
          color: '#6ee7b7',
          background: 'rgba(16, 185, 129, 0.1)',
          padding: '4px 10px',
          borderRadius: '4px'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Check size={12} color="#10b981" /> Last Spoken Line Auto-Tracked: "{lastSavedSegment.text}"
          </span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {formatPreciseTime(lastSavedSegment.start)} - {formatPreciseTime(lastSavedSegment.end)}
          </span>
        </div>
      )}
    </div>
  );
}
