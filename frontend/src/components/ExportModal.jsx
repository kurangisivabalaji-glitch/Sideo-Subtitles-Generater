import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  Film, 
  Check, 
  AlertCircle, 
  Sparkles,
  Layers,
  Code
} from 'lucide-react';
import { API_BASE } from '../utils/apiConfig';

export function ExportModal({
  originalSegments,
  translatedSegments,
  originalLanguage,
  translatedLanguage,
  translations = {},
  videoFilename,
  styleOptions,
  jobId
}) {
  const [selectedTrack, setSelectedTrack] = useState('original'); // 'original' or langCode
  const [isBurning, setIsBurning] = useState(false);
  const [burnProgress, setBurnProgress] = useState(0);
  const [burnStep, setBurnStep] = useState('');
  const [burnDownloadUrl, setBurnDownloadUrl] = useState(null);
  const [burnError, setBurnError] = useState(null);

  const trackKeys = Object.keys(translations);
  const hasTranslation = trackKeys.length > 0 || (translatedSegments && translatedSegments.length > 0);

  let currentSegments = originalSegments;
  let currentLangLabel = originalLanguage || 'original';

  if (selectedTrack === 'original') {
    currentSegments = originalSegments;
    currentLangLabel = originalLanguage || 'original';
  } else if (translations[selectedTrack]) {
    currentSegments = translations[selectedTrack].segments;
    currentLangLabel = translations[selectedTrack].name || selectedTrack;
  } else if (selectedTrack === 'translated') {
    currentSegments = translatedSegments;
    currentLangLabel = translatedLanguage || 'translated';
  }

  const downloadClientFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const downloadFile = async (format) => {
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    const toSrtTime = (sec) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 1000);
      return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
    };
    const toVttTime = (sec) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 1000);
      return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
    };

    try {
      const response = await fetch(`${API_BASE}/api/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: currentSegments,
          filename: `subtitles_${currentLangLabel}_${Date.now()}`
        })
      });

      if (!response.ok) throw new Error(`Export ${format.toUpperCase()} failed`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subtitles_${currentLangLabel}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      // Instant Client-side file generator fallback for Netlify cloud demo
      if (format === 'srt') {
        const content = currentSegments.map((s, i) => `${i + 1}\n${toSrtTime(s.start)} --> ${toSrtTime(s.end)}\n${s.text}\n`).join('\n');
        downloadClientFile(content, `subtitles_${currentLangLabel}.srt`, 'text/plain;charset=utf-8');
      } else if (format === 'vtt') {
        const content = 'WEBVTT\n\n' + currentSegments.map((s, i) => `${i + 1}\n${toVttTime(s.start)} --> ${toVttTime(s.end)}\n${s.text}\n`).join('\n');
        downloadClientFile(content, `subtitles_${currentLangLabel}.vtt`, 'text/vtt;charset=utf-8');
      } else if (format === 'txt') {
        const content = currentSegments.map(s => s.text).join('\n');
        downloadClientFile(content, `subtitles_${currentLangLabel}.txt`, 'text/plain;charset=utf-8');
      } else if (format === 'json') {
        const content = JSON.stringify(currentSegments, null, 2);
        downloadClientFile(content, `subtitles_${currentLangLabel}.json`, 'application/json');
      } else {
        const content = currentSegments.map(s => s.text).join('\n');
        downloadClientFile(content, `subtitles_${currentLangLabel}.${format}`, 'text/plain;charset=utf-8');
      }
    }
  };

  const handleStartBurn = async () => {
    setIsBurning(true);
    setBurnProgress(20);
    setBurnStep('Burning styled subtitles permanently into video frame via FFmpeg...');
    setBurnDownloadUrl(null);
    setBurnError(null);

    try {
      const response = await fetch(`${API_BASE}/api/export/burn-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_filename: videoFilename,
          job_id: jobId,
          segments: currentSegments,
          style: styleOptions,
          track_type: selectedTrack
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to start video burn process');
      }

      const data = await response.json();

      // If direct result returned immediately
      if (data.download_url) {
        setBurnProgress(100);
        const resolvedUrl = data.download_url.startsWith('http') 
          ? data.download_url 
          : `${API_BASE}${data.download_url}`;
        setBurnDownloadUrl(resolvedUrl);
        setBurnStep('Burned video ready for download!');
        setIsBurning(false);
        return;
      }

      const pollJobId = data.job_id;
      if (!pollJobId) {
        setIsBurning(false);
        setBurnProgress(100);
        return;
      }

      // Poll job status until completed
      const pollInterval = setInterval(async () => {
        try {
          const jobRes = await fetch(`${API_BASE}/api/jobs/${pollJobId}`);
          if (!jobRes.ok) return;
          const job = await jobRes.json();

          if (job.status === 'processing') {
            setBurnProgress(job.progress || 60);
            setBurnStep(job.step || 'Rendering subtitles into video...');
          } else if (job.status === 'completed') {
            clearInterval(pollInterval);
            setIsBurning(false);
            setBurnProgress(100);
            const dl = job.result?.download_url || `/media/outputs/${job.result?.filename}`;
            setBurnDownloadUrl(dl.startsWith('http') ? dl : `${API_BASE}${dl}`);
            setBurnStep('Burned video ready for download!');
          } else if (job.status === 'failed') {
            clearInterval(pollInterval);
            setIsBurning(false);
            setBurnError(job.error || 'FFmpeg burn process failed.');
          }
        } catch (pollErr) {
          console.error('Burn polling error:', pollErr);
        }
      }, 1500);

    } catch (err) {
      setIsBurning(false);
      setBurnError(err.message || 'Failed to initiate burn process.');
    }
  };

  return (
    <div style={{
      padding: '24px',
      overflowY: 'auto',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Track Selector */}
      <div style={{
        background: 'rgba(0,0,0,0.25)',
        padding: '16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem', marginBottom: '10px' }}>
          <Layers size={16} color="#6366f1" /> Select Subtitle Track for Export
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedTrack('original')}
            className={`btn ${selectedTrack === 'original' ? 'btn-primary' : 'btn-soft-primary'}`}
            style={{ fontSize: '0.84rem' }}
          >
            Original ({originalLanguage || 'Spoken'})
          </button>
          {trackKeys.map(code => (
            <button
              key={code}
              onClick={() => setSelectedTrack(code)}
              className={`btn ${selectedTrack === code ? 'btn-purple' : 'btn-soft-purple'}`}
              style={{ fontSize: '0.84rem' }}
            >
              {translations[code]?.name || code.toUpperCase()}
            </button>
          ))}
          {trackKeys.length === 0 && translatedSegments && translatedSegments.length > 0 && (
            <button
              onClick={() => setSelectedTrack('translated')}
              className={`btn ${selectedTrack === 'translated' ? 'btn-purple' : 'btn-soft-purple'}`}
              style={{ fontSize: '0.84rem' }}
            >
              Translated ({translatedLanguage || 'Translated'})
            </button>
          )}
        </div>
      </div>

      {/* Section 1: Subtitle Files */}
      <div>
        <h4 style={{
          fontSize: '0.86rem',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          marginBottom: '12px'
        }}>
          Subtitle File Downloads
        </h4>
        {/* Subtitle Format Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
          {/* SRT */}
          <button
            onClick={() => downloadFile('srt')}
            className="btn btn-soft-cyan"
            style={{ padding: '16px 12px', flexDirection: 'column', gap: '8px' }}
          >
            <FileText size={24} color="#22d3ee" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Download SRT</span>
            <span style={{ fontSize: '0.72rem', color: '#67e8f9' }}>Universal SubRip (UTF-8)</span>
          </button>

          {/* VTT */}
          <button
            onClick={() => downloadFile('vtt')}
            className="btn btn-soft-purple"
            style={{ padding: '16px 12px', flexDirection: 'column', gap: '8px' }}
          >
            <Code size={24} color="#c084fc" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Download VTT</span>
            <span style={{ fontSize: '0.72rem', color: '#d8b4fe' }}>WebVTT for Web Players</span>
          </button>

          {/* JSON */}
          <button
            onClick={() => downloadFile('json')}
            className="btn btn-soft-amber"
            style={{ padding: '16px 12px', flexDirection: 'column', gap: '8px' }}
          >
            <Download size={24} color="#fbbf24" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Download JSON</span>
            <span style={{ fontSize: '0.72rem', color: '#fde68a' }}>Timestamps &amp; Data</span>
          </button>
        </div>
      </div>

      {/* Section 2: Hardcode / Burn-in Video */}
      <div style={{
        padding: '20px',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(245, 158, 11, 0.12) 100%)',
        border: '1px solid rgba(244, 63, 94, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 8px 24px rgba(244, 63, 94, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f43f5e, #f59e0b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(244, 63, 94, 0.4)'
          }}>
            <Film size={20} color="#ffffff" />
          </div>
          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
              Burn Subtitles into Video (Hardcode)
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Embeds subtitles permanently into the video using FFmpeg with your customized typography, colors, and positioning.
            </p>
          </div>
        </div>

        {/* Burn progress or actions */}
        {isBurning ? (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#67e8f9', marginBottom: '8px' }}>
              {burnStep}
            </p>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '999px',
              overflow: 'hidden',
              marginBottom: '8px'
            }}>
              <div style={{
                width: `${burnProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ff416c, #f97316)',
                transition: 'width 0.4s ease'
              }} />
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Rendering via FFmpeg...</span>
          </div>
        ) : burnDownloadUrl ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'rgba(16, 185, 129, 0.15)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(16, 185, 129, 0.4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7', fontWeight: 600, fontSize: '0.92rem' }}>
              <Check size={18} /> Subtitles Burned Successfully!
            </div>
            <a
              href={burnDownloadUrl}
              download
              className="btn btn-emerald"
              style={{ padding: '12px', fontSize: '0.95rem' }}
            >
              <Download size={18} /> Download Burned MP4 Video
            </a>
          </div>
        ) : (
          <div>
            <button
              onClick={handleStartBurn}
              className="btn btn-gradient-flame"
              style={{ width: '100%', padding: '13px', fontSize: '0.98rem' }}
            >
              <Sparkles size={18} /> Render &amp; Burn Subtitles to Video
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px' }}>
              Subtitles will be rendered into high definition MP4 with H.264 video encoding.
            </p>
          </div>
        )}

        {burnError && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '6px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fda4af',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            {burnError}
          </div>
        )}
      </div>
    </div>
  );
}
