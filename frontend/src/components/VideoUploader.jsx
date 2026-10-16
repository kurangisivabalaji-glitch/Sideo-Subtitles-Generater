import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Film, 
  Cpu, 
  Globe, 
  Sparkles, 
  FileCheck, 
  AlertCircle, 
  CheckCircle2,
  Play,
  Languages
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../utils/languages';

export function VideoUploader({ onStartTranscription, onUseSampleVideo, onStartLiveVoiceSession }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileDetails, setFileDetails] = useState(null);
  const [selectedModel, setSelectedModel] = useState('base');
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('none');
  const [errorMsg, setErrorMsg] = useState(null);

  const fileInputRef = useRef(null);

  const supportedExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.flv', '.m4v', '.ts'];

  const validateAndSetFile = (file) => {
    setErrorMsg(null);
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!supportedExtensions.includes(ext)) {
      setErrorMsg(`Unsupported file type: "${ext}". Please upload an MP4, MOV, WebM, MKV, or AVI video.`);
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setErrorMsg('File exceeds the 500 MB limit. Please select a smaller video file.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Read metadata via temporary HTML5 video
    const tempVid = document.createElement('video');
    tempVid.preload = 'metadata';
    tempVid.src = url;
    tempVid.onloadedmetadata = () => {
      setFileDetails({
        duration: tempVid.duration,
        width: tempVid.videoWidth,
        height: tempVid.videoHeight,
        sizeMb: (file.size / (1024 * 1024)).toFixed(1)
      });
    };
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleStart = () => {
    if (!selectedFile) {
      setErrorMsg('Please select a video file first.');
      return;
    }
    onStartTranscription({
      file: selectedFile,
      model: selectedModel,
      language: selectedLanguage,
      targetLanguage: targetLanguage !== 'none' ? targetLanguage : null,
      localPreviewUrl: previewUrl
    });
  };

  return (
    <div style={{ maxWidth: '960px', margin: '40px auto', padding: '0 20px' }}>
      {/* Intro banner */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          marginBottom: '14px',
          color: '#a5b4fc',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <Sparkles size={14} color="#6366f1" /> Multilingual AI Subtitle Generation
        </div>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '2.4rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginBottom: '10px'
        }}>
          Generate Synchronized Subtitles for Any Video
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto' }}>
          Upload any video in Telugu, English, Hindi, Tamil, Kannada, Malayalam, Arabic, Spanish, French, or 90+ other languages. Whisper AI transcribes real speech with precise timestamps.
        </p>
      </div>

      {/* Main card */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        {/* Upload Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mp4,.mov,.webm,.avi,.mkv,.flv,.m4v,.ts"
            style={{ display: 'none' }}
            onChange={handleChange}
          />

          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: '#a5b4fc'
          }}>
            <UploadCloud size={32} />
          </div>

          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>
            {selectedFile ? 'Change Video File' : 'Drag & Drop your video here, or Browse'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '14px' }}>
            Supports MP4, MOV, WebM, AVI, MKV, FLV • Up to 500 MB
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {['MP4', 'MOV', 'WebM', 'MKV', 'AVI'].map(ext => (
              <span key={ext} style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--text-secondary)'
              }}>
                {ext}
              </span>
            ))}
          </div>
        </div>

        {/* Selected file preview pill */}
        {selectedFile && fileDetails && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}>
                <Film size={20} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedFile.name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {fileDetails.width}x{fileDetails.height} • {fileDetails.sizeMb} MB • {Math.round(fileDetails.duration)} seconds
                </p>
              </div>
            </div>
            <span className="badge badge-emerald">
              <CheckCircle2 size={13} /> Ready to transcribe
            </span>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#fda4af',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem'
          }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Configuration settings */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginTop: '28px',
          paddingTop: '24px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          {/* Spoken Language */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>
              <Globe size={16} color="#06b6d4" />
              Spoken Language in Video
            </label>
            <select
              className="select-field"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag ? `${lang.flag} ` : ''}{lang.name} ({lang.native})
                </option>
              ))}
            </select>

            {/* Quick Language Color Shortcuts */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
              {[
                { code: 'auto', label: 'Auto Detect', cls: 'btn-soft-cyan', activeCls: 'btn-cyan' },
                { code: 'te', label: 'తెలుగు (Telugu)', cls: 'btn-soft-emerald', activeCls: 'btn-emerald' },
                { code: 'en', label: 'English', cls: 'btn-soft-blue', activeCls: 'btn-blue' },
                { code: 'hi', label: 'हिन्दी (Hindi)', cls: 'btn-soft-amber', activeCls: 'btn-amber' },
                { code: 'ta', label: 'தமிழ் (Tamil)', cls: 'btn-soft-purple', activeCls: 'btn-purple' },
                { code: 'es', label: 'Español', cls: 'btn-soft-rose', activeCls: 'btn-rose' },
              ].map(item => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setSelectedLanguage(item.code)}
                  className={`btn ${selectedLanguage === item.code ? item.activeCls : item.cls}`}
                  style={{
                    fontSize: '0.74rem',
                    padding: '3px 9px',
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Automatic AI detection supports 99+ languages and preserves native scripts.
            </p>
          </div>

          {/* AI Model Size */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>
              <Cpu size={16} color="#a5b4fc" />
              AI Transcription Model
            </label>
            <select
              className="select-field"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="base">Base (~145 MB) - Fast &amp; Balanced (Recommended)</option>
              <option value="tiny">Tiny (~75 MB) - Ultra Fast</option>
              <option value="small">Small (~460 MB) - High Multilingual Accuracy</option>
              <option value="medium">Medium (~1.5 GB) - Complex Audio / Accents</option>
              <option value="large-v3">Large v3 (~3.1 GB) - Maximum Precision</option>
            </select>

            {/* Quick Model Visual Color Selector */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
              {[
                { id: 'base', label: 'Base', desc: 'Balanced', cls: 'btn-soft-cyan', activeCls: 'btn-cyan' },
                { id: 'tiny', label: 'Tiny', desc: 'Fastest', cls: 'btn-soft-emerald', activeCls: 'btn-emerald' },
                { id: 'small', label: 'Small', desc: 'Accurate', cls: 'btn-soft-blue', activeCls: 'btn-blue' },
                { id: 'medium', label: 'Medium', desc: 'Pro', cls: 'btn-soft-purple', activeCls: 'btn-purple' },
                { id: 'large-v3', label: 'Large v3', desc: 'Maximum', cls: 'btn-soft-rose', activeCls: 'btn-rose' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedModel(item.id)}
                  className={`btn ${selectedModel === item.id ? item.activeCls : item.cls}`}
                  style={{
                    fontSize: '0.74rem',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 700
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Powered by faster-whisper CTranslate2 optimized for high speed.
            </p>
          </div>

          {/* Target Translation Language */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Languages size={16} color="#a855f7" />
                Translate Subtitles To
              </span>
              <span className="badge badge-purple" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>Optional</span>
            </label>
            <select
              className="select-field"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
            >
              <option value="none">None - Keep Original Spoken Language</option>
              {SUPPORTED_LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag ? `${lang.flag} ` : ''}{lang.name} ({lang.native})
                </option>
              ))}
            </select>

            {/* Quick Translation Target Shortcuts */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
              {[
                { code: 'none', label: 'No Translation', cls: 'btn-soft-purple', activeCls: 'btn-purple' },
                { code: 'te', label: 'తెలుగు (Telugu)', cls: 'btn-soft-emerald', activeCls: 'btn-emerald' },
                { code: 'en', label: 'English', cls: 'btn-soft-cyan', activeCls: 'btn-cyan' },
                { code: 'hi', label: 'हिन्दी (Hindi)', cls: 'btn-soft-amber', activeCls: 'btn-amber' },
                { code: 'es', label: 'Español', cls: 'btn-soft-rose', activeCls: 'btn-rose' },
                { code: 'ta', label: 'தமிழ்', cls: 'btn-soft-purple', activeCls: 'btn-purple' },
              ].map(item => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setTargetLanguage(item.code)}
                  className={`btn ${targetLanguage === item.code ? item.activeCls : item.cls}`}
                  style={{
                    fontSize: '0.74rem',
                    padding: '3px 9px',
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Automatically convert subtitles to any language while retaining original timings.
            </p>
          </div>
        </div>

        {/* Action Buttons with High-Contrast Colors */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {/* Live Speak Auto-Track button */}
            <button
              type="button"
              onClick={() => onStartLiveVoiceSession && onStartLiveVoiceSession(selectedLanguage)}
              className="btn btn-emerald"
              style={{ fontSize: '0.9rem', padding: '12px 22px', fontWeight: 700, boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)' }}
            >
              🎙️ Speak Live &amp; Auto-Track
            </button>

            {/* Sample Video button */}
            <button
              type="button"
              onClick={onUseSampleVideo}
              className="btn btn-cyan"
              style={{ fontSize: '0.9rem', padding: '12px 22px', fontWeight: 700, boxShadow: '0 4px 18px rgba(6, 182, 212, 0.4)' }}
            >
              <Play size={16} fill="#ffffff" /> Try Demo Video
            </button>
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={!selectedFile}
            className="btn btn-gradient-flame"
            style={{
              fontSize: '1rem',
              padding: '12px 32px',
              fontWeight: 800,
              boxShadow: selectedFile ? '0 6px 24px rgba(255, 75, 43, 0.55)' : 'none',
              opacity: selectedFile ? 1 : 0.5
            }}
          >
            <Sparkles size={18} /> {targetLanguage !== 'none' ? 'Generate & Translate Subtitles' : 'Generate Subtitles'}
          </button>
        </div>
      </div>
    </div>
  );
}
