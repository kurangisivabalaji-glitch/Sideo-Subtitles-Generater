// Smart API Base Resolver:
// 1. Checks VITE_API_URL environment variable (for deployed backend on Render/Railway/Fly.io)
// 2. If running locally or on LAN Wi-Fi, uses http://127.0.0.1:8000
// 3. In cloud production (Netlify), uses relative URL or fallback
const isBrowser = typeof window !== 'undefined';
const isLocal = isBrowser && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.')
);

const customBackend = isBrowser ? (localStorage.getItem('subtitle_custom_backend') || '').trim() : '';

export const API_BASE = customBackend || import.meta.env.VITE_API_URL 
  || (isLocal ? 'http://127.0.0.1:8000' : '');

export const WS_BASE = import.meta.env.VITE_WS_URL 
  || (isLocal 
      ? 'ws://127.0.0.1:8000' 
      : (isBrowser && window.location.protocol === 'https:' ? `wss://${window.location.host}` : `ws://${isBrowser ? window.location.host : 'localhost'}`));

export const isNetlify = isBrowser && (
  window.location.hostname.includes('netlify.app') || 
  window.location.hostname.includes('netlify')
);

export const hasLiveBackend = Boolean(import.meta.env.VITE_API_URL || isLocal);
