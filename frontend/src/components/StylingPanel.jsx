import React from 'react';
import { Type, Palette, Layout, Sliders, Check, Sparkles, Wand2 } from 'lucide-react';

export function StylingPanel({ styleOptions, onChangeStyle }) {
  // Comprehensive collection of 24 top subtitle fonts organized by genre
  const fontGroups = [
    {
      category: '🔥 Viral Shorts & Social (TikTok / Reels / YouTube)',
      fonts: [
        { id: 'Anton', name: 'Anton (Viral TikTok / Shorts Heavy)' },
        { id: 'Bebas Neue', name: 'Bebas Neue (Tall Cinematic Condensed)' },
        { id: 'Bangers', name: 'Bangers (Comic & Pop Art Punch)' },
        { id: 'Teko', name: 'Teko (Ultra-Condensed Hype/Sports)' },
        { id: 'Oswald', name: 'Oswald (High-Impact Heavy)' },
        { id: 'Russo One', name: 'Russo One (Gaming & Sci-Fi Bold)' }
      ]
    },
    {
      category: '✨ Modern & Clean (Streaming & Studio)',
      fonts: [
        { id: 'Outfit', name: 'Outfit (Modern Geometric Sans)' },
        { id: 'Poppins', name: 'Poppins (Creator Favorite Rounded)' },
        { id: 'Inter', name: 'Inter (Ultra-Crisp Streaming)' },
        { id: 'Montserrat', name: 'Montserrat (Bold Clean Sans)' },
        { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans (Crisp Modern)' },
        { id: 'Roboto', name: 'Roboto (Clean Standard)' },
        { id: 'Rubik', name: 'Rubik (Soft Friendly Rounded)' }
      ]
    },
    {
      category: '🎬 Cinematic & Editorial Luxury',
      fonts: [
        { id: 'Cinzel', name: 'Cinzel (Regal Movie Titles)' },
        { id: 'Playfair Display', name: 'Playfair Display (Luxury Editorial Serif)' },
        { id: 'Merriweather', name: 'Merriweather (Literary Storytelling)' },
        { id: 'Georgia', name: 'Georgia (Classic Book Serif)' }
      ]
    },
    {
      category: '🎨 Creator, Vlog & Tech Style',
      fonts: [
        { id: 'Caveat', name: 'Caveat (Handwritten Vlog Commentary)' },
        { id: 'Bungee', name: 'Bungee (Retro Arcade Pop)' },
        { id: 'JetBrains Mono', name: 'JetBrains Mono (Coding & Tech Hacker)' },
        { id: 'Courier New', name: 'Courier New (Monospace Typewriter)' }
      ]
    },
    {
      category: '🌐 Universal Standard',
      fonts: [
        { id: 'Arial', name: 'Arial (Clean Standard)' },
        { id: 'Trebuchet MS', name: 'Trebuchet MS (High Legibility)' },
        { id: 'Noto Sans', name: 'Noto Sans (Global Multi-Language)' }
      ]
    }
  ];

  // Flattened font list for quick lookups
  const allFonts = fontGroups.flatMap(g => g.fonts);

  // Quick font shortcut chips for instant 1-click styling
  const quickFontChips = [
    { id: 'Anton', label: '🔥 Anton', style: { fontFamily: 'Anton' } },
    { id: 'Bebas Neue', label: '🎬 Bebas', style: { fontFamily: 'Bebas Neue' } },
    { id: 'Poppins', label: '✨ Poppins', style: { fontFamily: 'Poppins' } },
    { id: 'Outfit', label: '💎 Outfit', style: { fontFamily: 'Outfit' } },
    { id: 'Inter', label: '⚡ Inter', style: { fontFamily: 'Inter' } },
    { id: 'Cinzel', label: '👑 Cinzel', style: { fontFamily: 'Cinzel' } },
    { id: 'Caveat', label: '✍️ Caveat', style: { fontFamily: 'Caveat' } },
    { id: 'JetBrains Mono', label: '💻 Mono', style: { fontFamily: 'JetBrains Mono' } }
  ];

  // Expanded 16 vibrant color palette for high-impact subtitle styling
  const colorPresets = [
    { label: 'Pure White', hex: '#FFFFFF', shadow: 'rgba(255,255,255,0.4)' },
    { label: 'Canary Yellow', hex: '#FACC15', shadow: 'rgba(250,204,21,0.5)' },
    { label: 'Gold Amber', hex: '#F59E0B', shadow: 'rgba(245,158,11,0.5)' },
    { label: 'Coral Orange', hex: '#FB923C', shadow: 'rgba(251,146,60,0.5)' },
    { label: 'Sunset Crimson', hex: '#F43F5E', shadow: 'rgba(244,63,94,0.5)' },
    { label: 'Hot Magenta', hex: '#EC4899', shadow: 'rgba(236,72,153,0.5)' },
    { label: 'Electric Purple', hex: '#A855F7', shadow: 'rgba(168,85,247,0.5)' },
    { label: 'Deep Violet', hex: '#8B5CF6', shadow: 'rgba(139,92,246,0.5)' },
    { label: 'Royal Blue', hex: '#3B82F6', shadow: 'rgba(59,130,246,0.5)' },
    { label: 'Sky Blue', hex: '#38BDF8', shadow: 'rgba(56,189,248,0.5)' },
    { label: 'Neon Cyan', hex: '#22D3EE', shadow: 'rgba(34,211,238,0.5)' },
    { label: 'Teal Aqua', hex: '#14B8A6', shadow: 'rgba(20,184,166,0.5)' },
    { label: 'Mint Emerald', hex: '#10B981', shadow: 'rgba(16,185,129,0.5)' },
    { label: 'Fresh Lime', hex: '#84CC16', shadow: 'rgba(132,204,22,0.5)' },
    { label: 'Bright Platinum', hex: '#E2E8F0', shadow: 'rgba(226,232,240,0.4)' },
    { label: 'Slate Silver', hex: '#94A3B8', shadow: 'rgba(148,163,184,0.4)' }
  ];

  // 1-Click Popular Subtitle Style Themes (Expanded with viral font combinations)
  const styleThemes = [
    {
      name: 'TikTok Viral',
      color: '#FACC15',
      bgStyle: 'transparent',
      fontFamily: 'Anton',
      badgeClass: 'btn-soft-amber'
    },
    {
      name: 'Cinema Trailer',
      color: '#FFFFFF',
      bgStyle: 'transparent',
      fontFamily: 'Bebas Neue',
      badgeClass: 'btn-soft-cyan'
    },
    {
      name: 'Netflix Classic',
      color: '#FFFFFF',
      bgStyle: 'transparent',
      fontFamily: 'Inter',
      badgeClass: 'btn-soft-cyan'
    },
    {
      name: 'YouTube Gold',
      color: '#FACC15',
      bgStyle: 'outline',
      fontFamily: 'Poppins',
      badgeClass: 'btn-soft-amber'
    },
    {
      name: 'Cyberpunk Cyan',
      color: '#22D3EE',
      bgStyle: 'transparent',
      fontFamily: 'Outfit',
      badgeClass: 'btn-soft-cyan'
    },
    {
      name: 'Matrix Terminal',
      color: '#10B981',
      bgStyle: 'box',
      bgOpacity: 0.8,
      fontFamily: 'JetBrains Mono',
      badgeClass: 'btn-soft-emerald'
    },
    {
      name: 'Regal Film',
      color: '#E2E8F0',
      bgStyle: 'transparent',
      fontFamily: 'Cinzel',
      badgeClass: 'btn-soft-purple'
    },
    {
      name: 'Gaming Hype',
      color: '#FB923C',
      bgStyle: 'outline',
      fontFamily: 'Russo One',
      badgeClass: 'btn-soft-amber'
    },
    {
      name: 'Vlog Story',
      color: '#84CC16',
      bgStyle: 'transparent',
      fontFamily: 'Caveat',
      badgeClass: 'btn-soft-emerald'
    }
  ];

  const updateProp = (key, val) => {
    onChangeStyle({ ...styleOptions, [key]: val });
  };

  const applyTheme = (theme) => {
    onChangeStyle({
      ...styleOptions,
      textColor: theme.color,
      bgStyle: theme.bgStyle,
      fontFamily: theme.fontFamily,
      bgOpacity: theme.bgOpacity || styleOptions.bgOpacity || 0.7
    });
  };

  return (
    <div style={{
      padding: '20px',
      overflowY: 'auto',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Live Preview Card */}
      <div>
        <h4 style={{
          fontSize: '0.84rem',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          marginBottom: '10px'
        }}>
          Live Style Preview
        </h4>
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: 'var(--radius-md)',
          padding: '24px 16px',
          textAlign: 'center',
          minHeight: '100px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
        }}>
          <span style={{
            fontFamily: styleOptions.fontFamily,
            fontSize: `${styleOptions.fontSize}px`,
            color: styleOptions.textColor,
            fontWeight: 700,
            padding: styleOptions.bgStyle === 'box' ? '6px 14px' : '2px 6px',
            borderRadius: '6px',
            background: styleOptions.bgStyle === 'box' ? `rgba(0,0,0,${styleOptions.bgOpacity || 0.7})` : 'transparent',
            textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 2px 6px rgba(0,0,0,0.95)'
          }}>
            Sample Subtitle • తెలుగు • English • हिन्दी
          </span>
        </div>
      </div>

      {/* 1-Click Color & Style Themes */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 600, fontSize: '0.88rem', marginBottom: '8px' }}>
          <Wand2 size={15} color="#ec4899" /> Quick Preset Themes
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {styleThemes.map((theme, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applyTheme(theme)}
              className={`btn ${theme.badgeClass}`}
              style={{
                fontSize: '0.78rem',
                padding: '8px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center'
              }}
              title={`Apply ${theme.name} theme`}
            >
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: theme.color, boxShadow: `0 0 6px ${theme.color}` }} />
              <span className="truncate">{theme.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Text Color Palette (16 Vibrant Buttons) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 600, fontSize: '0.88rem' }}>
            <Palette size={15} color="#f59e0b" /> Text Color Palette
          </label>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.78rem',
            padding: '2px 8px',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.06)',
            color: styleOptions.textColor,
            border: `1px solid ${styleOptions.textColor}`
          }}>
            {styleOptions.textColor}
          </span>
        </div>

        {/* 16 Color Buttons Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: '8px',
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '12px'
        }}>
          {colorPresets.map(preset => {
            const isSelected = styleOptions.textColor.toUpperCase() === preset.hex.toUpperCase();
            return (
              <button
                key={preset.hex}
                type="button"
                onClick={() => updateProp('textColor', preset.hex)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: preset.hex,
                  border: isSelected ? '2.5px solid #ffffff' : '1px solid rgba(255,255,255,0.25)',
                  boxShadow: isSelected ? `0 0 12px ${preset.shadow}, 0 2px 6px rgba(0,0,0,0.8)` : `0 2px 4px rgba(0,0,0,0.3)`,
                  transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none'
                }}
                title={`${preset.label} (${preset.hex})`}
              >
                {isSelected && (
                  <Check size={14} color={preset.hex === '#FFFFFF' ? '#000000' : '#ffffff'} strokeWidth={3} />
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Hex Picker Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="color"
            value={styleOptions.textColor}
            onChange={(e) => updateProp('textColor', e.target.value)}
            style={{ width: '38px', height: '38px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'transparent' }}
            title="Custom Color Picker"
          />
          <input
            type="text"
            value={styleOptions.textColor}
            onChange={(e) => updateProp('textColor', e.target.value)}
            placeholder="#FFFFFF"
            style={{ flex: 1, padding: '7px 12px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: '#fff', fontSize: '0.84rem', fontFamily: 'var(--font-mono)' }}
          />
        </div>
      </div>

      {/* Font Family Selector with Categories & Quick Chips */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 600, fontSize: '0.88rem' }}>
            <Type size={15} color="#6366f1" /> Typography Font ({allFonts.length} Styles)
          </label>
          <span style={{ fontSize: '0.75rem', color: '#a5b4fc', fontFamily: styleOptions.fontFamily, fontWeight: 700 }}>
            {styleOptions.fontFamily}
          </span>
        </div>

        {/* Grouped Dropdown */}
        <select
          className="select-field"
          value={styleOptions.fontFamily}
          onChange={(e) => updateProp('fontFamily', e.target.value)}
          style={{
            fontFamily: styleOptions.fontFamily,
            fontWeight: 600,
            marginBottom: '10px'
          }}
        >
          {fontGroups.map((group, idx) => (
            <optgroup key={idx} label={group.category} style={{ background: '#111827', color: '#38bdf8', fontWeight: 700 }}>
              {group.fonts.map(f => (
                <option 
                  key={f.id} 
                  value={f.id} 
                  style={{ 
                    fontFamily: f.id, 
                    background: '#1f2937', 
                    color: '#f9fafb',
                    padding: '6px'
                  }}
                >
                  {f.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* 1-Click Quick Font Style Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {quickFontChips.map(chip => {
            const active = styleOptions.fontFamily === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => updateProp('fontFamily', chip.id)}
                style={{
                  ...chip.style,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: active ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                  background: active ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#38bdf8' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: active ? '0 0 10px rgba(56, 189, 248, 0.3)' : 'none'
                }}
                title={`Switch to ${chip.id} font`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Sliders size={15} color="#06b6d4" /> Subtitle Size
          </span>
          <span style={{ color: '#67e8f9', fontFamily: 'var(--font-mono)' }}>{styleOptions.fontSize}px</span>
        </div>
        <input
          type="range"
          min="16"
          max="48"
          step="1"
          value={styleOptions.fontSize}
          onChange={(e) => updateProp('fontSize', parseInt(e.target.value))}
          style={{ width: '100%', height: '5px', accentColor: 'var(--accent-cyan)' }}
        />
      </div>

      {/* Background Style with Vibrant Active Buttons */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 600, fontSize: '0.88rem', marginBottom: '8px' }}>
          <Layout size={15} color="#10b981" /> Subtitle Background Style
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[
            { id: 'transparent', label: 'Transparent (No Box)', activeClass: 'btn-cyan', idleClass: 'btn-soft-cyan' },
            { id: 'outline', label: 'Outline Shadow', activeClass: 'btn-primary', idleClass: 'btn-soft-primary' },
            { id: 'box', label: 'Translucent Box', activeClass: 'btn-purple', idleClass: 'btn-soft-purple' }
          ].map(style => (
            <button
              key={style.id}
              onClick={() => updateProp('bgStyle', style.id)}
              className={`btn ${styleOptions.bgStyle === style.id ? style.activeClass : style.idleClass}`}
              style={{ fontSize: '0.78rem', padding: '9px 6px', textAlign: 'center' }}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Background Opacity (if box) */}
      {styleOptions.bgStyle === 'box' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
            <span>Box Opacity</span>
            <span style={{ color: '#a5b4fc', fontFamily: 'var(--font-mono)' }}>
              {Math.round((styleOptions.bgOpacity || 0.7) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={styleOptions.bgOpacity || 0.7}
            onChange={(e) => updateProp('bgOpacity', parseFloat(e.target.value))}
            style={{ width: '100%', height: '5px', accentColor: 'var(--primary)' }}
          />
        </div>
      )}

      {/* Position with Colorful Active & Idle Buttons */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 600, fontSize: '0.88rem', marginBottom: '8px' }}>
          <Layout size={15} color="#8b5cf6" /> Vertical Position
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[
            { id: 'bottom', label: 'Bottom (Default)', activeClass: 'btn-emerald', idleClass: 'btn-soft-emerald' },
            { id: 'middle', label: 'Middle', activeClass: 'btn-cyan', idleClass: 'btn-soft-cyan' },
            { id: 'top', label: 'Top', activeClass: 'btn-amber', idleClass: 'btn-soft-amber' }
          ].map(pos => (
            <button
              key={pos.id}
              onClick={() => updateProp('position', pos.id)}
              className={`btn ${styleOptions.position === pos.id ? pos.activeClass : pos.idleClass}`}
              style={{ fontSize: '0.78rem', padding: '9px 6px' }}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
