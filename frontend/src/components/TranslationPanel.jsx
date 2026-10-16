import React, { useState, useRef } from 'react';
import { 
  Languages, 
  Sparkles, 
  Check, 
  ArrowRight, 
  Globe, 
  RotateCcw, 
  Eye, 
  Layers,
  AlertCircle,
  Download,
  Copy,
  Plus,
  Trash2,
  FileText,
  UploadCloud,
  CheckCircle2,
  FileCode,
  Zap
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, getLanguageName, isLanguageRtl } from '../utils/languages';

export function TranslationPanel({
  originalSegments = [],
  translatedSegments = [],
  translatedLanguage,
  originalLanguage,
  translations = {},
  activeTrack = 'original',
  onSwitchTrack,
  onPerformTranslation,
  onBatchTranslation,
  onUpdateTranslatedSegments,
  onSeek
}) {
  const [activeTabMode, setActiveTabMode] = useState('studio'); // 'studio' | 'file-converter'
  const [targetLang, setTargetLang] = useState('te');
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Batch translation state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchSelectedLangs, setBatchSelectedLangs] = useState(['te', 'hi', 'en', 'es']);
  const [isBatchTranslating, setIsBatchTranslating] = useState(false);

  // File Converter state
  const [converterFile, setConverterFile] = useState(null);
  const [converterContent, setConverterContent] = useState('');
  const [converterTargetLang, setConverterTargetLang] = useState('te');
  const [converterResult, setConverterResult] = useState(null);
  const [isConvertingFile, setIsConvertingFile] = useState(false);
  const [converterError, setConverterError] = useState(null);
  const fileInputRef = useRef(null);

  // Available languages excluding auto
  const translationTargets = SUPPORTED_LANGUAGES.filter(l => l.code !== 'auto');

  // Currently displayed translated track
  const currentTransTrack = translations[activeTrack] || (translatedSegments.length > 0 ? {
    code: activeTrack === 'original' ? 'translated' : activeTrack,
    name: translatedLanguage || 'Translated',
    segments: translatedSegments,
    isRtl: isLanguageRtl(activeTrack)
  } : null);

  const displaySegments = (currentTransTrack && currentTransTrack.segments) || translatedSegments;

  // Perform single language translation
  const handleTranslateClick = async (langCode = targetLang) => {
    setIsTranslating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await onPerformTranslation(langCode);
      const name = getLanguageName(langCode);
      setSuccessMsg(`Subtitles converted to ${name} successfully!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to translate subtitles. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Perform batch translation
  const handleExecuteBatch = async () => {
    if (!batchSelectedLangs || batchSelectedLangs.length === 0) {
      setErrorMsg('Please select at least one target language for batch conversion.');
      return;
    }
    setIsBatchTranslating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (onBatchTranslation) {
        await onBatchTranslation(batchSelectedLangs);
      } else {
        // Fallback sequentially
        for (const code of batchSelectedLangs) {
          await onPerformTranslation(code);
        }
      }
      setShowBatchModal(false);
      setSuccessMsg(`Successfully converted subtitles into ${batchSelectedLangs.length} languages!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed batch translation.');
    } finally {
      setIsBatchTranslating(false);
    }
  };

  const toggleBatchLang = (code) => {
    setBatchSelectedLangs(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleTranslatedTextChange = (id, newText) => {
    const updated = displaySegments.map(seg => 
      seg.id === id ? { ...seg, text: newText } : seg
    );
    onUpdateTranslatedSegments(updated);
  };

  // Direct subtitle download (SRT / VTT)
  const handleDownloadTrack = async (format) => {
    try {
      const segs = activeTrack === 'original' ? originalSegments : displaySegments;
      const langName = activeTrack === 'original' ? (originalLanguage || 'original') : (currentTransTrack?.name || translatedLanguage || 'translated');
      const token = localStorage.getItem('subtitle_platform_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          segments: segs,
          filename: `subtitles_${langName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`
        })
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subtitles_${langName.toLowerCase().replace(/\s+/g, '_')}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      alert(`Download failed: ${e.message}`);
    }
  };

  // Subtitle File Converter Handler
  const handleFileDrop = (file) => {
    setConverterError(null);
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.srt') && !name.endsWith('.vtt') && !name.endsWith('.txt')) {
      setConverterError('Please select a valid .srt or .vtt subtitle file.');
      return;
    }
    setConverterFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setConverterContent(e.target.result || '');
    };
    reader.readAsText(file);
  };

  const handleConvertFile = async () => {
    if (!converterContent || !converterContent.trim()) {
      setConverterError('Please upload a subtitle file or paste subtitle contents first.');
      return;
    }
    setIsConvertingFile(true);
    setConverterError(null);
    try {
      const isVtt = (converterFile && converterFile.name.endsWith('.vtt')) || converterContent.trim().startsWith('WEBVTT');
      const token = localStorage.getItem('subtitle_platform_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/translate/convert-subtitles', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: converterContent,
          file_format: isVtt ? 'vtt' : 'srt',
          target_language: converterTargetLang,
          source_language: 'auto'
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Subtitle conversion failed.');
      }
      const data = await res.json();
      setConverterResult(data);
    } catch (err) {
      setConverterError(err.message);
    } finally {
      setIsConvertingFile(false);
    }
  };

  const handleDownloadConverted = (format) => {
    if (!converterResult) return;
    const content = format === 'vtt' ? converterResult.vtt : converterResult.srt;
    const blob = new Blob([content], { type: format === 'vtt' ? 'text/vtt' : 'application/x-subrip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted_${converterResult.target_language}.${format}`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // List of all available tracks
  const trackKeys = Object.keys(translations);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Top Navigation Mode Switcher: Studio Video Subtitles vs Subtitle File Converter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(15, 23, 42, 0.75)',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveTabMode('studio')}
            className={`btn ${activeTabMode === 'studio' ? 'btn-primary' : 'btn-soft-primary'}`}
            style={{ fontSize: '0.8rem', padding: '5px 12px' }}
          >
            <Languages size={14} /> Video Subtitles Studio
          </button>
          <button
            onClick={() => setActiveTabMode('file-converter')}
            className={`btn ${activeTabMode === 'file-converter' ? 'btn-purple' : 'btn-soft-purple'}`}
            style={{ fontSize: '0.8rem', padding: '5px 12px' }}
          >
            <FileCode size={14} /> Convert .SRT / .VTT File
          </button>
        </div>

        {activeTabMode === 'studio' && (
          <button
            onClick={() => setShowBatchModal(true)}
            className="btn btn-gradient-flame"
            style={{ fontSize: '0.78rem', padding: '5px 14px', fontWeight: 700 }}
            title="Convert subtitles into multiple languages simultaneously"
          >
            <Zap size={14} /> Batch Convert Subtitles
          </button>
        )}
      </div>

      {/* MODE 1: STUDIO VIDEO SUBTITLES */}
      {activeTabMode === 'studio' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          
          {/* Configuration Header */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            
            {/* Quick Language Shortcut Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Convert to:</span>
              {[
                { code: 'te', label: 'తెలుగు (Telugu)', cls: 'btn-soft-emerald', activeCls: 'btn-emerald' },
                { code: 'hi', label: 'हिन्दी (Hindi)', cls: 'btn-soft-amber', activeCls: 'btn-amber' },
                { code: 'en', label: 'English', cls: 'btn-soft-cyan', activeCls: 'btn-cyan' },
                { code: 'es', label: 'Español', cls: 'btn-soft-purple', activeCls: 'btn-purple' },
                { code: 'ta', label: 'தமிழ் (Tamil)', cls: 'btn-soft-purple', activeCls: 'btn-purple' },
                { code: 'fr', label: 'Français', cls: 'btn-soft-cyan', activeCls: 'btn-cyan' },
                { code: 'ar', label: 'العربية', cls: 'btn-soft-amber', activeCls: 'btn-amber' },
              ].map(q => (
                <button
                  key={q.code}
                  type="button"
                  onClick={() => {
                    setTargetLang(q.code);
                    handleTranslateClick(q.code);
                  }}
                  disabled={isTranslating}
                  className={`btn ${targetLang === q.code ? q.activeCls : q.cls}`}
                  style={{ fontSize: '0.74rem', padding: '4px 9px', borderRadius: '6px' }}
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Translation Controls row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <select
                  className="select-field"
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  style={{ fontSize: '0.86rem', padding: '8px 12px' }}
                >
                  {translationTargets.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag ? `${lang.flag} ` : ''}{lang.name} ({lang.native})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => handleTranslateClick(targetLang)}
                disabled={isTranslating || !originalSegments || originalSegments.length === 0}
                className="btn btn-purple"
                style={{ fontSize: '0.88rem', padding: '9px 18px', fontWeight: 700 }}
              >
                {isTranslating ? (
                  <>
                    <span className="animate-spin">⏳</span> Converting...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Convert Subtitles
                  </>
                )}
              </button>
            </div>

            {/* Notifications */}
            {errorMsg && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fda4af',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={14} />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#6ee7b7',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Check size={14} />
                {successMsg}
              </div>
            )}

            {/* Multilingual Tracks Selector Strip */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: 600 }}>
                  Active Subtitle Track:
                </span>
                
                {/* Original Track button */}
                <button
                  onClick={() => onSwitchTrack('original')}
                  className={`btn ${activeTrack === 'original' ? 'btn-primary' : 'btn-soft-primary'}`}
                  style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                >
                  Original ({originalLanguage || 'Spoken'})
                </button>

                {/* All Generated Translation Track buttons */}
                {trackKeys.length > 0 ? (
                  trackKeys.map(code => {
                    const tr = translations[code];
                    const isActive = activeTrack === code;
                    return (
                      <button
                        key={code}
                        onClick={() => onSwitchTrack(code)}
                        className={`btn ${isActive ? 'btn-purple' : 'btn-soft-purple'}`}
                        style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                      >
                        {tr.name} ({code.toUpperCase()})
                      </button>
                    );
                  })
                ) : (
                  translatedSegments && translatedSegments.length > 0 && (
                    <button
                      onClick={() => onSwitchTrack('translated')}
                      className={`btn ${activeTrack === 'translated' ? 'btn-purple' : 'btn-soft-purple'}`}
                      style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                    >
                      {translatedLanguage || targetLang.toUpperCase()}
                    </button>
                  )
                )}
              </div>

              {/* Quick Download currently displayed track */}
              {(displaySegments?.length > 0 || originalSegments?.length > 0) && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleDownloadTrack('srt')}
                    className="btn btn-soft-cyan"
                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                    title="Download active track as SRT file"
                  >
                    <Download size={12} /> .SRT
                  </button>
                  <button
                    onClick={() => handleDownloadTrack('vtt')}
                    className="btn btn-soft-cyan"
                    style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                    title="Download active track as VTT file"
                  >
                    <Download size={12} /> .VTT
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Subtitles Synchronized Dual-Column View */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {(!displaySegments || displaySegments.length === 0) ? (
              <div style={{
                textAlign: 'center',
                padding: '50px 20px',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(6, 182, 212, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#06b6d4'
                }}>
                  <Globe size={28} />
                </div>
                <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                  No Translation Generated Yet
                </h4>
                <p style={{ maxWidth: '440px', fontSize: '0.88rem' }}>
                  Choose your target language above (e.g., Telugu, Hindi, Spanish, English) and click <strong>Convert Subtitles</strong> or use <strong>Batch Convert</strong>.
                </p>
              </div>
            ) : (
              originalSegments.map((orig, idx) => {
                const trans = displaySegments.find(t => t.id === orig.id) || displaySegments[idx];
                return (
                  <div
                    key={orig.id || idx}
                    style={{
                      background: 'rgba(18, 26, 43, 0.55)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    {/* Timing bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 600 }}>#{idx + 1}</span>
                      <button
                        onClick={() => onSeek && onSeek(orig.start)}
                        className="btn btn-soft-cyan"
                        style={{ fontSize: '0.72rem', padding: '2px 7px', fontFamily: 'var(--font-mono)' }}
                        title="Seek video to this subtitle line"
                      >
                        {orig.start.toFixed(2)}s - {orig.end.toFixed(2)}s
                      </button>
                    </div>

                    {/* Dual column: Original vs Translated */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Original Box */}
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Original ({originalLanguage || 'Spoken'})
                        </div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {orig.text}
                        </div>
                      </div>

                      {/* Translated Box (Editable) */}
                      <div style={{
                        background: 'rgba(168, 85, 247, 0.06)',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(168, 85, 247, 0.25)'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: '#c084fc', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Converted ({currentTransTrack?.name || translatedLanguage || targetLang.toUpperCase()})
                        </div>
                        <textarea
                          value={trans ? trans.text : ''}
                          onChange={(e) => handleTranslatedTextChange(orig.id, e.target.value)}
                          rows={2}
                          style={{
                            width: '100%',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-main)',
                            fontSize: '0.88rem',
                            lineHeight: 1.4,
                            outline: 'none',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODE 2: STANDALONE SUBTITLE FILE CONVERTER (.SRT / .VTT) */}
      {activeTabMode === 'file-converter' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto'
              }}>
                <FileCode size={24} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 700 }}>
                Convert Subtitle File to Different Languages
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                Upload an existing .SRT or .VTT file to instantly convert all dialogs and timestamps into Telugu, Hindi, English, Spanish, or any of 40+ languages.
              </p>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '30px 20px',
                textAlign: 'center',
                background: 'rgba(0, 0, 0, 0.2)',
                cursor: 'pointer'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".srt,.vtt,.txt"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileDrop(e.target.files[0]);
                  }
                }}
              />
              <UploadCloud size={32} color="#a855f7" style={{ margin: '0 auto 10px auto' }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                {converterFile ? converterFile.name : 'Click to Upload Subtitle File (.srt or .vtt)'}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {converterFile ? `${(converterFile.size / 1024).toFixed(1)} KB` : 'Or paste your subtitle content below'}
              </p>
            </div>

            {/* Or Paste Raw Subtitles Textarea */}
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Subtitle Content Preview / Paste Text:
              </label>
              <textarea
                value={converterContent}
                onChange={(e) => setConverterContent(e.target.value)}
                placeholder="1&#10;00:00:01,000 --> 00:00:04,000&#10;Hello, welcome to this video."
                rows={6}
                className="input-field"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', lineHeight: 1.5 }}
              />
            </div>

            {/* Target Language Selection & Action */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Target Language:
                </label>
                <select
                  className="select-field"
                  value={converterTargetLang}
                  onChange={(e) => setConverterTargetLang(e.target.value)}
                >
                  {translationTargets.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag ? `${lang.flag} ` : ''}{lang.name} ({lang.native})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleConvertFile}
                disabled={isConvertingFile || !converterContent.trim()}
                className="btn btn-purple"
                style={{ marginTop: '22px', padding: '10px 24px', fontWeight: 700 }}
              >
                {isConvertingFile ? (
                  <>
                    <span className="animate-spin">⏳</span> Converting...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Convert &amp; Generate Subtitles
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {converterError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fda4af',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} /> {converterError}
              </div>
            )}

            {/* Converted Subtitle Result & Downloads */}
            {converterResult && (
              <div style={{
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} color="#10b981" />
                    <span style={{ fontWeight: 700, color: '#6ee7b7' }}>
                      Converted to {converterResult.target_language_name} ({converterResult.segments.length} lines)
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleDownloadConverted('srt')}
                      className="btn btn-emerald"
                      style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                    >
                      <Download size={14} /> Download .SRT
                    </button>
                    <button
                      onClick={() => handleDownloadConverted('vtt')}
                      className="btn btn-soft-emerald"
                      style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                    >
                      <Download size={14} /> Download .VTT
                    </button>
                  </div>
                </div>

                {/* Live Preview of Converted Subtitle */}
                <textarea
                  readOnly
                  value={converterResult.srt}
                  rows={8}
                  className="input-field"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                    background: 'rgba(0,0,0,0.3)'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* BATCH CONVERSION MODAL */}
      {showBatchModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '560px',
            width: '100%',
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={20} color="#f59e0b" />
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 700 }}>
                  Batch Convert Subtitles
                </h3>
              </div>
              <button
                onClick={() => setShowBatchModal(false)}
                className="btn btn-soft-primary"
                style={{ fontSize: '0.76rem', padding: '4px 10px' }}
              >
                Cancel
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Select target languages to generate multiple synchronized subtitle tracks in one run:
            </p>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setBatchSelectedLangs(['te', 'hi', 'ta', 'kn', 'ml'])}
                className="btn btn-soft-emerald"
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                Top Indian Languages
              </button>
              <button
                type="button"
                onClick={() => setBatchSelectedLangs(['en', 'es', 'fr', 'de', 'ar', 'zh', 'ja'])}
                className="btn btn-soft-cyan"
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                Top Global Languages
              </button>
              <button
                type="button"
                onClick={() => setBatchSelectedLangs([])}
                className="btn btn-soft-primary"
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                Clear All
              </button>
            </div>

            {/* Checkbox grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '8px',
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '8px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px'
            }}>
              {translationTargets.map(lang => {
                const checked = batchSelectedLangs.includes(lang.code);
                return (
                  <label
                    key={lang.code}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      background: checked ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                      border: `1px solid ${checked ? 'rgba(168, 85, 247, 0.4)' : 'transparent'}`
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBatchLang(lang.code)}
                    />
                    <span>{lang.flag} {lang.name}</span>
                  </label>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {batchSelectedLangs.length} languages selected
              </span>
              <button
                onClick={handleExecuteBatch}
                disabled={isBatchTranslating || batchSelectedLangs.length === 0}
                className="btn btn-gradient-flame"
                style={{ padding: '9px 20px', fontWeight: 700 }}
              >
                {isBatchTranslating ? (
                  <>
                    <span className="animate-spin">⏳</span> Processing...
                  </>
                ) : (
                  <>
                    <Zap size={15} /> Convert into {batchSelectedLangs.length} Languages
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default TranslationPanel;
