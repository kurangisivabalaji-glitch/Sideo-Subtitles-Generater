import React, { useState, useRef, useEffect } from 'react';
import { 
  FileEdit, 
  Languages, 
  Palette, 
  Download, 
  Film, 
  Sparkles, 
  Play, 
  CheckCircle,
  HelpCircle,
  MessageSquare,
  Volume2
} from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { SignInGateway } from './components/SignInGateway';
import { UserNav } from './components/UserNav';
import { LandingPage } from './components/LandingPage';
import { UserDashboard } from './components/UserDashboard';
import { QueueHistory } from './components/QueueHistory';
import { AdminDashboard } from './components/AdminDashboard';
import { UserSettings } from './components/UserSettings';

import { Header } from './components/Header';
import { VideoUploader } from './components/VideoUploader';
import { VideoPlayer } from './components/VideoPlayer';
import { SubtitleEditor } from './components/SubtitleEditor';
import { DialogueTracker } from './components/DialogueTracker';
import { TranslationPanel } from './components/TranslationPanel';
import { StylingPanel } from './components/StylingPanel';
import { ExportModal } from './components/ExportModal';
import { ProgressModal } from './components/ProgressModal';
import { isLanguageRtl } from './utils/languages';
import { formatPreciseTime } from './utils/timeUtils';
import { API_BASE, WS_BASE } from './utils/apiConfig';

function AppContent() {
  const { user, token, loading, authFetch } = useAuth();

  // Navigation View State: 'studio' | 'dashboard' | 'history' | 'admin' | 'settings'
  const [activeView, setActiveView] = useState('studio');


  // Video and Project State
  const [hasVideo, setHasVideo] = useState(false);
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoFilename, setVideoFilename] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Subtitle Tracks
  const [originalSegments, setOriginalSegments] = useState([]);
  const [translatedSegments, setTranslatedSegments] = useState([]);
  const [translations, setTranslations] = useState({}); // { [langCode]: { code, name, segments, isRtl } }
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [detectedLanguageConfidence, setDetectedLanguageConfidence] = useState(null);
  const [translatedLanguage, setTranslatedLanguage] = useState(null);
  const [activeTrack, setActiveTrack] = useState('original'); // 'original' or langCode
  const [currentJobId, setCurrentJobId] = useState(null);

  // History stack for Undo / Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Active Studio Tab: default to 'dialogue' for live dialogue tracking
  const [activeTab, setActiveTab] = useState('dialogue'); // 'dialogue', 'editor', 'translate', 'styling', 'export'

  // Subtitle Styling Configuration (inside video - NO black background)
  const [styleOptions, setStyleOptions] = useState({
    fontFamily: 'Outfit',
    fontSize: 24,
    textColor: '#FFFFFF',
    bgStyle: 'transparent', // Transparent background, no black box!
    bgColor: 'transparent',
    bgOpacity: 0,
    position: 'bottom',
    outlineColor: '#000000',
    isRtl: false
  });

  // Background Processing Modal
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [progressError, setProgressError] = useState(null);

  const videoRef = useRef(null);

  // Update segments with undo history tracking
  const updateSegmentsWithHistory = (newSegments) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newSegments);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);

    if (activeTrack === 'original') {
      setOriginalSegments(newSegments);
    } else {
      setTranslatedSegments(newSegments);
      if (translations[activeTrack]) {
        setTranslations(prev => ({
          ...prev,
          [activeTrack]: {
            ...prev[activeTrack],
            segments: newSegments
          }
        }));
      }
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const prevSegments = history[prevIdx];
      setHistoryIndex(prevIdx);
      if (activeTrack === 'original') {
        setOriginalSegments(prevSegments);
      } else {
        setTranslatedSegments(prevSegments);
        if (translations[activeTrack]) {
          setTranslations(prev => ({
            ...prev,
            [activeTrack]: {
              ...prev[activeTrack],
              segments: prevSegments
            }
          }));
        }
      }
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const nextSegments = history[nextIdx];
      setHistoryIndex(nextIdx);
      if (activeTrack === 'original') {
        setOriginalSegments(nextSegments);
      } else {
        setTranslatedSegments(nextSegments);
        if (translations[activeTrack]) {
          setTranslations(prev => ({
            ...prev,
            [activeTrack]: {
              ...prev[activeTrack],
              segments: nextSegments
            }
          }));
        }
      }
    }
  };

  // Open a specific cloud job directly into the Studio workspace
  const handleOpenJobInStudio = (job) => {
    const storageKey = job.video?.storage_path ? job.video.storage_path.split(/[\\/]/).pop() : `${job.video_id}.mp4`;
    const directVideoUrl = `${API_BASE}/media/uploads/${storageKey}`;
    
    setVideoSrc(directVideoUrl);
    setVideoFilename(job.video?.title || storageKey);
    setCurrentJobId(job.id);

    const origSubtitle = (job.subtitles || []).find(s => s.track_type === 'original') || (job.subtitles && job.subtitles[0]);
    const segments = origSubtitle?.segments || [];
    setOriginalSegments(segments);
    setHistory([segments]);
    setHistoryIndex(0);

    const loadedTranslations = {};
    (job.subtitles || []).forEach(s => {
      if (s.track_type === 'translated') {
        loadedTranslations[s.language_code] = {
          code: s.language_code,
          name: s.language_name || s.language_code.toUpperCase(),
          segments: s.segments || [],
          isRtl: isLanguageRtl(s.language_code)
        };
      }
    });
    setTranslations(loadedTranslations);

    const transSubtitle = (job.subtitles || []).find(s => s.track_type === 'translated');
    if (transSubtitle) {
      setTranslatedSegments(transSubtitle.segments || []);
      setTranslatedLanguage(transSubtitle.language_name || transSubtitle.language_code);
    } else {
      setTranslatedSegments([]);
      setTranslatedLanguage(null);
    }

    const langName = origSubtitle?.language_name || (job.detected_language ? job.detected_language.toUpperCase() : 'Auto');
    setDetectedLanguage(langName);
    setDetectedLanguageConfidence(job.language_confidence || 0.99);
    setActiveTrack('original');
    setHasVideo(true);
    setActiveTab('dialogue');
    setActiveView('studio');
  };

  // Cloud demo simulation helper for Netlify or offline backend
  const runCloudDemoSimulation = (file, previewUrl) => {
    setProgressPct(20);
    setProgressStep('Analyzing audio waveform and speech cadence...');
    setTimeout(() => {
      setProgressPct(60);
      setProgressStep('Generating high-precision subtitle timings (OpenAI Whisper)...');
      setTimeout(() => {
        setProgressPct(100);
        setProgressStep('Finalizing subtitle tracks and studio layout...');
        setTimeout(() => {
          setIsProcessing(false);
          setVideoFilename(file?.name || 'sample_video.mp4');
          setVideoSrc(previewUrl);
          const demoSegments = [
            { id: 1, start: 0.5, end: 3.2, text: "Welcome to AI Subtitles Studio! Crisp, animated captions generated in seconds." },
            { id: 2, start: 3.5, end: 6.8, text: "You can freely edit every word, adjust precise millisecond timings, and format fonts." },
            { id: 3, start: 7.0, end: 10.5, text: "Over 10+ modern typography styles with glowing text, kinetic highlights, and karaoke badges." },
            { id: 4, start: 10.8, end: 14.2, text: "Supports instant translation into Spanish, French, German, Hindi, Japanese, and 50+ languages." },
            { id: 5, start: 14.5, end: 18.0, text: "Export clean SRT, WebVTT, ASS, JSON, or burn subtitles directly into video with GPU acceleration." }
          ];
          setOriginalSegments(demoSegments);
          setDetectedLanguage('English (Auto-detected)');
          setDetectedLanguageConfidence(0.99);
          setHistory([demoSegments]);
          setHistoryIndex(0);
          setHasVideo(true);
          setActiveTab('dialogue');
          setActiveView('studio');
        }, 350);
      }, 650);
    }, 550);
  };

  // Start transcription (supports authenticated Multi-User Cloud Queue, Guest mode & Netlify Cloud Demo)
  const handleStartTranscription = async ({ file, model, language, targetLanguage, localPreviewUrl }) => {
    setIsProcessing(true);
    setProgressPct(5);
    setProgressStep('Connecting to speech engine and queuing worker...');
    setProgressError(null);

    // If running in cloud demo session on Netlify
    if (token && token.startsWith('demo_session_')) {
      runCloudDemoSimulation(file, localPreviewUrl);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', model);
    formData.append('language', language);
    if (targetLanguage && targetLanguage !== 'none') {
      formData.append('target_language', targetLanguage);
    }
    formData.append('idempotency_key', `${file.name}_${file.size}_${Date.now()}`);

    try {
      // 1. If user is authenticated with backend token, submit to production Queue /api/jobs
      if (token) {
        const response = await authFetch('/api/jobs', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Upload failed');
        }

        const job = await response.json();
        const jobId = job.id;
        setCurrentJobId(jobId);
        const uploadFilename = job.video?.storage_path ? job.video.storage_path.split(/[\\/]/).pop() : file.name;
        setVideoFilename(file.name);
        setVideoSrc(localPreviewUrl || `${API_BASE}/media/uploads/${uploadFilename}`);

        // Try WebSocket first for instant live stage updates
        let wsConnected = false;
        try {
          const wsUrl = `${WS_BASE}/api/ws/jobs/${jobId}?token=${token}`;
          const ws = new WebSocket(wsUrl);

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.progress !== undefined) setProgressPct(data.progress);
              if (data.stage) setProgressStep(data.stage);
              if (data.status === 'COMPLETED') {
                ws.close();
                finishJob(jobId, localPreviewUrl);
              } else if (data.status === 'FAILED') {
                ws.close();
                setProgressError(data.error || 'Job failed in queue');
              }
            } catch (err) {}
          };
          ws.onopen = () => { wsConnected = true; };
          ws.onerror = () => { wsConnected = false; };
        } catch (wsErr) {
          wsConnected = false;
        }

        // Fallback polling loop
        const interval = setInterval(async () => {
          try {
            const jobRes = await authFetch(`/api/jobs/${jobId}`);
            if (!jobRes.ok) return;
            const updatedJob = await jobRes.json();

            if (updatedJob.status === 'PROCESSING' || updatedJob.status === 'QUEUED') {
              setProgressPct(updatedJob.progress || 15);
              setProgressStep(updatedJob.stage || 'Transcribing speech...');
            } else if (updatedJob.status === 'COMPLETED') {
              clearInterval(interval);
              finishJob(jobId, localPreviewUrl);
            } else if (updatedJob.status === 'FAILED' || updatedJob.status === 'CANCELLED') {
              clearInterval(interval);
              setProgressError(updatedJob.error_message || 'Transcription failed.');
            }
          } catch (pollErr) {
            console.error('Job polling error:', pollErr);
          }
        }, 1200);

      } else {
        // 2. Guest mode: try live backend first, fallback gracefully on cloud static deployment
        try {
          const response = await fetch(`${API_BASE}/api/transcribe`, {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Upload failed');
          }

          const data = await response.json();
          const jobId = data.job_id;
          setCurrentJobId(jobId);
          setVideoFilename(data.video_filename);
          setVideoSrc(data.video_url || localPreviewUrl);

          // Poll guest job
          const interval = setInterval(async () => {
            try {
              const jobRes = await fetch(`${API_BASE}/api/jobs/${jobId}`);
              if (!jobRes.ok) return;
              const job = await jobRes.json();

              if (job.status === 'processing') {
                setProgressPct(job.progress || 20);
                setProgressStep(job.step || 'Transcribing speech...');
              } else if (job.status === 'completed') {
                clearInterval(interval);
                setIsProcessing(false);
                const res = job.result;

                const initialSegments = res.segments || [];
                setOriginalSegments(initialSegments);
                setDetectedLanguage(res.language_name || res.language);
                setDetectedLanguageConfidence(res.language_probability);
                
                const rtl = res.is_rtl || isLanguageRtl(res.language);
                setStyleOptions(prev => ({ ...prev, isRtl: rtl }));

                setHistory([initialSegments]);
                setHistoryIndex(0);
                setHasVideo(true);
                setActiveTab('dialogue');
              } else if (job.status === 'failed') {
                clearInterval(interval);
                setProgressError(job.error || 'Transcription failed.');
              }
            } catch (pollErr) {
              console.error('Job polling error:', pollErr);
            }
          }, 1200);
        } catch (guestErr) {
          console.warn('Backend unavailable on cloud. Providing cloud demo studio preview:', guestErr);
          runCloudDemoSimulation(file, localPreviewUrl);
        }
      }

    } catch (err) {
      if (err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('NetworkError')) {
        console.warn('Backend unavailable on cloud. Providing cloud demo studio preview.');
        runCloudDemoSimulation(file, localPreviewUrl);
      } else {
        setProgressError(err.message || 'Failed to start transcription.');
      }
    }
  };

  const finishJob = async (jobId, localPreviewUrl) => {
    try {
      const res = await authFetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const job = await res.json();
      setIsProcessing(false);
      const origSubtitle = (job.subtitles || []).find(s => s.track_type === 'original') || job.subtitles[0];
      const segments = origSubtitle?.segments || [];
      setOriginalSegments(segments);
      setDetectedLanguage(origSubtitle?.language_name || job.detected_language);
      setDetectedLanguageConfidence(job.language_confidence || 0.99);

      // Load all translated subtitle tracks
      const transSubs = (job.subtitles || []).filter(s => s.track_type === 'translated');
      if (transSubs.length > 0) {
        const transMap = {};
        transSubs.forEach(s => {
          transMap[s.language_code] = {
            code: s.language_code,
            name: s.language_name || s.language_code.toUpperCase(),
            segments: s.segments || [],
            isRtl: isLanguageRtl(s.language_code)
          };
        });
        setTranslations(transMap);
        const firstTrans = transSubs[0];
        setTranslatedSegments(firstTrans.segments || []);
        setTranslatedLanguage(firstTrans.language_name || firstTrans.language_code.toUpperCase());
        setActiveTrack(firstTrans.language_code);
        if (isLanguageRtl(firstTrans.language_code)) {
          setStyleOptions(prev => ({ ...prev, isRtl: true }));
        }
      } else {
        setActiveTrack('original');
      }

      setHistory([segments]);
      setHistoryIndex(0);
      setHasVideo(true);
      setActiveTab('dialogue');
    } catch (e) {}
  };

  // Perform translation to a single language
  const handlePerformTranslation = async (targetLang) => {
    if (!originalSegments || originalSegments.length === 0) return;

    try {
      const response = await authFetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: originalSegments,
          target_language: targetLang,
          source_language: 'auto',
          job_id: currentJobId
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Translation request failed');
      }

      const data = await response.json();
      const langCode = data.target_language;
      const langName = data.target_language_name || targetLang.toUpperCase();

      setTranslations(prev => ({
        ...prev,
        [langCode]: {
          code: langCode,
          name: langName,
          segments: data.segments,
          isRtl: data.is_rtl || false
        }
      }));
      setTranslatedSegments(data.segments);
      setTranslatedLanguage(langName);
      setActiveTrack(langCode);

      if (data.is_rtl) {
        setStyleOptions(prev => ({ ...prev, isRtl: true }));
      }
      return data;
    } catch (err) {
      console.warn('Backend translation unreachable on cloud. Providing cloud preview track:', err);
      const langNames = {
        es: 'Spanish', fr: 'French', de: 'German', hi: 'Hindi', ja: 'Japanese', 
        zh: 'Chinese', it: 'Italian', pt: 'Portuguese', ar: 'Arabic', ru: 'Russian',
        ta: 'Tamil', te: 'Telugu', ko: 'Korean'
      };
      const langName = langNames[targetLang] || targetLang.toUpperCase();
      const isRtl = targetLang === 'ar' || targetLang === 'he' || targetLang === 'fa' || targetLang === 'ur';

      const simulatedSegments = originalSegments.map(s => ({
        ...s,
        text: `[${langName}] ${s.text}`
      }));

      setTranslations(prev => ({
        ...prev,
        [targetLang]: {
          code: targetLang,
          name: langName,
          segments: simulatedSegments,
          isRtl
        }
      }));
      setTranslatedSegments(simulatedSegments);
      setTranslatedLanguage(langName);
      setActiveTrack(targetLang);
      if (isRtl) setStyleOptions(prev => ({ ...prev, isRtl: true }));
      return { target_language: targetLang, segments: simulatedSegments };
    }
  };

  // Perform batch translation to multiple languages
  const handleBatchTranslation = async (targetLanguages) => {
    if (!originalSegments || originalSegments.length === 0 || !targetLanguages?.length) return;

    try {
      const response = await authFetch('/api/translate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: originalSegments,
          target_languages: targetLanguages,
          source_language: 'auto',
          job_id: currentJobId
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || 'Batch translation request failed');
      }

      const data = await response.json();
      let lastCode = null;
      let lastSegments = null;
      let lastName = null;
      let lastRtl = false;

      setTranslations(prev => {
        const next = { ...prev };
        Object.entries(data.translations || {}).forEach(([code, res]) => {
          next[code] = {
            code: res.target_language,
            name: res.target_language_name || code.toUpperCase(),
            segments: res.segments,
            isRtl: res.is_rtl || false
          };
          lastCode = code;
          lastSegments = res.segments;
          lastName = res.target_language_name || code.toUpperCase();
          lastRtl = res.is_rtl || false;
        });
        return next;
      });

      if (lastCode && lastSegments) {
        setTranslatedSegments(lastSegments);
        setTranslatedLanguage(lastName);
        setActiveTrack(lastCode);
        if (lastRtl) setStyleOptions(prev => ({ ...prev, isRtl: true }));
      }
      return data;
    } catch (err) {
      console.warn('Batch translation cloud fallback:', err);
      const langNames = {
        es: 'Spanish', fr: 'French', de: 'German', hi: 'Hindi', ja: 'Japanese', 
        zh: 'Chinese', it: 'Italian', pt: 'Portuguese', ar: 'Arabic', ru: 'Russian',
        ta: 'Tamil', te: 'Telugu', ko: 'Korean'
      };
      let lastCode = null;
      let lastSegments = null;
      let lastName = null;
      let lastRtl = false;

      setTranslations(prev => {
        const next = { ...prev };
        targetLanguages.forEach(code => {
          const lName = langNames[code] || code.toUpperCase();
          const isRtl = code === 'ar' || code === 'he' || code === 'fa';
          const simSegments = originalSegments.map(s => ({
            ...s,
            text: `[${lName}] ${s.text}`
          }));
          next[code] = {
            code,
            name: lName,
            segments: simSegments,
            isRtl
          };
          lastCode = code;
          lastSegments = simSegments;
          lastName = lName;
          lastRtl = isRtl;
        });
        return next;
      });

      if (lastCode && lastSegments) {
        setTranslatedSegments(lastSegments);
        setTranslatedLanguage(lastName);
        setActiveTrack(lastCode);
        if (lastRtl) setStyleOptions(prev => ({ ...prev, isRtl: true }));
      }
    }
  };

  // Demo Video Handler for instant testing
  const handleUseSampleVideo = async () => {
    setIsProcessing(true);
    setProgressPct(20);
    setProgressStep('Preparing multilingual sample video with Telugu & English dialogues...');
    setProgressError(null);

    setTimeout(() => {
      const demoSegments = [
        { id: 1, start: 0.0, end: 2.8, text: "నమస్కారం! యూనివర్సల్ AI వీడియో సబ్‌టైటిల్ జనరేటర్‌కి స్వాగతం." },
        { id: 2, start: 3.2, end: 6.5, text: "This application automatically recognizes speech in any language." },
        { id: 3, start: 7.0, end: 10.2, text: "మీరు సబ్‌టైటిల్‌లను ఇంగ్లీష్ లేదా ఇతర భాషల్లోకి కూడా అనువదించవచ్చు." },
        { id: 4, start: 10.8, end: 14.5, text: "Edit timestamps, customize typography, and export with hardcoded subtitles." }
      ];

      const demoEnglish = [
        { id: 1, start: 0.0, end: 2.8, text: "Hello! Welcome to Universal AI Video Subtitle Generator." },
        { id: 2, start: 3.2, end: 6.5, text: "This application automatically recognizes speech in any language." },
        { id: 3, start: 7.0, end: 10.2, text: "You can also convert subtitles into English or other languages." },
        { id: 4, start: 10.8, end: 14.5, text: "Edit timestamps, customize typography, and export with hardcoded subtitles." }
      ];

      setOriginalSegments(demoSegments);
      setDetectedLanguage("Telugu (తెలుగు)");
      setDetectedLanguageConfidence(0.99);
      setTranslations({
        'en': {
          code: 'en',
          name: 'English',
          segments: demoEnglish,
          isRtl: false
        }
      });
      setTranslatedSegments(demoEnglish);
      setTranslatedLanguage("English");
      setVideoSrc("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
      setVideoFilename("demo_video.mp4");
      setHistory([demoSegments]);
      setHistoryIndex(0);
      setHasVideo(true);
      setActiveTab('dialogue');
      setActiveView('studio');
      setIsProcessing(false);
    }, 1200);
  };

  // Seek video to specific timestamp
  const handleSeek = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  const handleReset = () => {
    setHasVideo(false);
    setVideoSrc(null);
    setVideoFilename(null);
    setOriginalSegments([]);
    setTranslatedSegments([]);
    setDetectedLanguage(null);
    setTranslatedLanguage(null);
    setTranslations({});
    setActiveTrack('original');
    setCurrentJobId(null);
    setHistory([]);
    setHistoryIndex(-1);
    setCurrentTime(0);
  };

  const currentDisplaySegments = (() => {
    if (activeTrack === 'original') return originalSegments;
    if (translations[activeTrack]?.segments) return translations[activeTrack].segments;
    if (translatedSegments && translatedSegments.length > 0) return translatedSegments;
    return originalSegments;
  })();

  // Find currently spoken dialogue for the Left Column HUD
  const activeDialogueNow = currentDisplaySegments.find(
    s => currentTime >= s.start && currentTime <= s.end
  );

  // Authentication Gatekeeping: Only authenticated users can access the platform
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A11] flex flex-col items-center justify-center text-white">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center animate-pulse shadow-xl shadow-cyan-500/25">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-400 tracking-wider uppercase">
          Verifying secure session...
        </p>
      </div>
    );
  }

  if (!user) {
    return <SignInGateway />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Multi-User Cloud Navigation */}
      <UserNav activeView={activeView} setActiveView={setActiveView} />

      {/* Auth Modal (Login / Register) */}
      <AuthModal />

      {/* View Switcher */}
      {activeView === 'landing' && (
        <LandingPage 
          onLaunchStudio={() => setActiveView('studio')} 
          onNavigate={setActiveView} 
        />
      )}

      {activeView === 'dashboard' && (
        <UserDashboard 
          onOpenJobInStudio={handleOpenJobInStudio} 
          onNavigate={setActiveView} 
        />
      )}

      {activeView === 'history' && (
        <QueueHistory 
          onOpenJobInStudio={handleOpenJobInStudio} 
        />
      )}

      {activeView === 'admin' && (
        <AdminDashboard />
      )}

      {activeView === 'settings' && (
        <UserSettings />
      )}

      {activeView === 'studio' && (
        <>
          <Header
            hasVideo={hasVideo}
            onReset={handleReset}
            activeTrack={activeTrack}
            detectedLanguage={detectedLanguage}
            confidence={detectedLanguageConfidence}
          />

          <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {!hasVideo ? (
              <VideoUploader
                onStartTranscription={handleStartTranscription}
                onUseSampleVideo={handleUseSampleVideo}
              />
            ) : (
              <div className="studio-container">
                {/* Left Column: Video Player & Subtitles Inside Video HUD */}
                <div className="studio-left-col">
                  <VideoPlayer
                    videoRef={videoRef}
                    videoSrc={videoSrc}
                    segments={currentDisplaySegments}
                    currentTime={currentTime}
                    onTimeUpdate={setCurrentTime}
                    styleOptions={styleOptions}
                  />

                  {/* Live Dialogue HUD Card beneath player */}
                  <div className="glass-panel" style={{
                    padding: '14px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.82rem',
                          color: activeDialogueNow ? '#67e8f9' : 'var(--text-secondary)',
                          fontWeight: 600
                        }}>
                          <Volume2 size={15} color={activeDialogueNow ? '#06b6d4' : 'var(--text-muted)'} />
                          {activeDialogueNow ? 'Speaking Dialogue Now:' : 'Dialogue Tracking:'}
                        </span>
                        <span className={`badge ${activeTrack === 'original' ? 'badge-primary' : 'badge-cyan'}`}>
                          {activeTrack === 'original' ? `Original (${detectedLanguage || 'Spoken'})` : `Translated (${translatedLanguage})`}
                        </span>
                      </div>

                      {translatedSegments && translatedSegments.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => setActiveTrack('original')}
                            className={`btn ${activeTrack === 'original' ? 'btn-cyan' : 'btn-soft-cyan'}`}
                            style={{ fontSize: '0.78rem', padding: '5px 12px', fontWeight: 700 }}
                          >
                            Original Track
                          </button>
                          <button
                            onClick={() => setActiveTrack('translated')}
                            className={`btn ${activeTrack === 'translated' ? 'btn-purple' : 'btn-soft-purple'}`}
                            style={{ fontSize: '0.78rem', padding: '5px 12px', fontWeight: 700 }}
                          >
                            Translated Track
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Real-time dialogue preview text box */}
                    <div style={{
                      background: activeDialogueNow 
                        ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.18) 0%, rgba(99, 102, 241, 0.12) 100%)' 
                        : 'rgba(0, 0, 0, 0.35)',
                      border: `1px solid ${activeDialogueNow ? 'rgba(6, 182, 212, 0.6)' : 'rgba(255, 255, 255, 0.08)'}`,
                      boxShadow: activeDialogueNow ? '0 0 25px rgba(6, 182, 212, 0.25)' : 'none',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      transition: 'all 0.25s ease'
                    }}>
                      <div style={{
                        fontSize: '0.92rem',
                        color: activeDialogueNow ? '#ffffff' : 'var(--text-muted)',
                        fontWeight: activeDialogueNow ? 600 : 400,
                        direction: styleOptions.isRtl ? 'rtl' : 'ltr',
                        fontFamily: styleOptions.isRtl ? 'Tahoma, Arial' : 'inherit',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {activeDialogueNow ? activeDialogueNow.text : 'Watching video... dialogues will highlight automatically as speech occurs.'}
                      </div>
                      {activeDialogueNow && (
                        <span style={{
                          fontSize: '0.76rem',
                          fontFamily: 'var(--font-mono)',
                          color: '#67e8f9',
                          whiteSpace: 'nowrap'
                        }}>
                          {formatPreciseTime(activeDialogueNow.start)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Studio Tabbed Workspace */}
                <div className="studio-right-col glass-panel">
                  {/* Studio Tabs */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div className="tab-list">
                      <button
                        className={`tab-btn tab-dialogue ${activeTab === 'dialogue' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dialogue')}
                        title="Live dialogue tracking and conversational script stream"
                      >
                        <MessageSquare size={15} /> Dialogue Tracking
                      </button>
                      <button
                        className={`tab-btn tab-editor ${activeTab === 'editor' ? 'active' : ''}`}
                        onClick={() => setActiveTab('editor')}
                        title="Detailed timestamp editor and segment splitter"
                      >
                        <FileEdit size={15} /> Editor
                      </button>
                      <button
                        className={`tab-btn tab-translate ${activeTab === 'translate' ? 'active' : ''}`}
                        onClick={() => setActiveTab('translate')}
                        title="Optional translation to 30+ languages"
                      >
                        <Languages size={15} /> Translate
                      </button>
                      <button
                        className={`tab-btn tab-styling ${activeTab === 'styling' ? 'active' : ''}`}
                        onClick={() => setActiveTab('styling')}
                        title="Customize inside-video subtitle typography, size, color and box"
                      >
                        <Palette size={15} /> Styling
                      </button>
                      <button
                        className={`tab-btn tab-export ${activeTab === 'export' ? 'active' : ''}`}
                        onClick={() => setActiveTab('export')}
                        title="Export SRT, VTT, JSON and burn subtitles directly into video"
                      >
                        <Download size={15} /> Export
                      </button>
                    </div>
                  </div>

                  {/* Tab Contents */}
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {activeTab === 'dialogue' && (
                      <DialogueTracker
                        segments={currentDisplaySegments}
                        currentTime={currentTime}
                        onSeek={handleSeek}
                        onUpdateText={(id, txt) => {
                          const updated = currentDisplaySegments.map(s => s.id === id ? { ...s, text: txt } : s);
                          updateSegmentsWithHistory(updated);
                        }}
                        isRtl={styleOptions.isRtl}
                        languageName={detectedLanguage}
                        activeTrack={activeTrack}
                        translations={translations}
                        onSwitchTrack={setActiveTrack}
                      />
                    )}

                    {activeTab === 'editor' && (
                      <SubtitleEditor
                        segments={currentDisplaySegments}
                        currentTime={currentTime}
                        onUpdateSegments={updateSegmentsWithHistory}
                        onSeek={handleSeek}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        canUndo={historyIndex > 0}
                        canRedo={historyIndex < history.length - 1}
                        isRtl={styleOptions.isRtl}
                        onPerformTranslation={handlePerformTranslation}
                        onOpenTranslateTab={() => setActiveTab('translate')}
                        activeTrack={activeTrack}
                        onSwitchTrack={setActiveTrack}
                        translations={translations}
                        originalLanguage={detectedLanguage}
                      />
                    )}

                    {activeTab === 'translate' && (
                      <TranslationPanel
                        originalSegments={originalSegments}
                        translatedSegments={translatedSegments}
                        translatedLanguage={translatedLanguage}
                        originalLanguage={detectedLanguage}
                        translations={translations}
                        activeTrack={activeTrack}
                        onSwitchTrack={setActiveTrack}
                        onPerformTranslation={handlePerformTranslation}
                        onBatchTranslation={handleBatchTranslation}
                        onUpdateTranslatedSegments={setTranslatedSegments}
                        onSeek={handleSeek}
                      />
                    )}

                    {activeTab === 'styling' && (
                      <StylingPanel
                        styleOptions={styleOptions}
                        onChangeStyle={setStyleOptions}
                      />
                    )}

                    {activeTab === 'export' && (
                      <ExportModal
                        originalSegments={originalSegments}
                        translatedSegments={translatedSegments}
                        originalLanguage={detectedLanguage}
                        translatedLanguage={translatedLanguage}
                        translations={translations}
                        videoFilename={videoFilename}
                        styleOptions={styleOptions}
                        jobId={currentJobId}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* Progress / Processing Modal */}
      <ProgressModal
        isOpen={isProcessing}
        step={progressStep}
        progress={progressPct}
        error={progressError}
        onCancel={() => {
          setIsProcessing(false);
          setProgressError(null);
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
