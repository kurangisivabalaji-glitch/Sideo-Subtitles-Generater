import React from 'react';
import { 
  Sparkles, 
  Film, 
  Globe2, 
  Layers, 
  ShieldCheck, 
  Cpu, 
  Download, 
  Check, 
  ArrowRight, 
  Play,
  Users,
  Server,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LandingPage({ onLaunchStudio, onNavigate }) {
  const { user, openLogin, openRegister } = useAuth();

  return (
    <div className="min-h-screen bg-[#070A10] text-white selection:bg-cyan-500 selection:text-black">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-cyan-500/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        
        {/* Release Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 text-xs font-semibold mb-8 backdrop-blur-md shadow-lg shadow-cyan-950/50">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>v2.0 Scalable Multi-User Cloud Architecture</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-tight">
          Universal AI Subtitles <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            For Any Video & Any Language
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
          High-performance multilingual speech recognition, interactive timeline editing, transparent in-video subtitles, and automatic translation for hundreds of simultaneous users.
        </p>

        {/* CTA Actions */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onLaunchStudio}
            className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-bold text-base shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Film className="w-5 h-5 text-black" />
            <span>Open Studio</span>
            <ArrowRight className="w-4 h-4 text-black" />
          </button>

          {!user ? (
            <button
              onClick={openRegister}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl btn btn-soft-purple text-base font-semibold backdrop-blur-xl shadow-lg shadow-purple-950/40 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Users className="w-5 h-5 text-purple-400" />
              <span>Sign Up Free</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl btn btn-soft-cyan text-base font-semibold backdrop-blur-xl shadow-lg shadow-cyan-950/40 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <span>Go to My Dashboard</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </button>
          )}
        </div>

        {/* Language Badges Showcase */}
        <div className="mt-14 pt-8 border-t border-slate-800/80 max-w-4xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-4">
            Supports 99+ World Languages with Auto-Detection & Native Scripts
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { code: 'Telugu', native: 'తెలుగు' },
              { code: 'English', native: 'English' },
              { code: 'Hindi', native: 'हिन्दी' },
              { code: 'Tamil', native: 'தமிழ்' },
              { code: 'Kannada', native: 'ಕನ್ನಡ' },
              { code: 'Malayalam', native: 'മലയാളം' },
              { code: 'Bengali', native: 'বাংলা' },
              { code: 'Urdu (RTL)', native: 'اردو' },
              { code: 'Arabic (RTL)', native: 'العربية' },
              { code: 'Spanish', native: 'Español' },
              { code: 'French', native: 'Français' },
              { code: 'German', native: 'Deutsch' },
              { code: 'Japanese', native: '日本語' },
              { code: 'Chinese', native: '中文' },
            ].map((lang) => (
              <span
                key={lang.code}
                className="px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300 hover:border-cyan-500/50 hover:text-white transition-all"
              >
                {lang.native} &bull; <span className="text-slate-400">{lang.code}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="p-8 rounded-2xl bg-[#0E131F]/80 border border-slate-800/80 backdrop-blur-xl hover:border-cyan-500/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center mb-5 text-cyan-400">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Multilingual Intelligence</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Automatic spoken language detection and Whisper transcription. Preserves full Unicode typography for Indic, East Asian, and RTL Arabic/Urdu scripts.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#0E131F]/80 border border-slate-800/80 backdrop-blur-xl hover:border-indigo-500/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center mb-5 text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Multi-User Tenant Isolation</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Every user's uploaded videos, generated subtitle tracks, and billing usage remain private. Cryptographically verified JWT sessions and row-level authorization.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#0E131F]/80 border border-slate-800/80 backdrop-blur-xl hover:border-purple-500/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-800/50 flex items-center justify-center mb-5 text-purple-400">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Async Concurrency Queue</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Background workers with concurrency limits prevent server memory crashes. Real-time WebSockets and SSE streams stage-by-stage transcription progress.
            </p>
          </div>

        </div>
      </section>

      {/* Studio Capabilities Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#0F172A] to-[#0A0E1A] border border-cyan-500/20 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/80 border border-cyan-800/50 text-cyan-400 text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Video Player</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Subtitles Inside the Video. <br />
                <span className="text-cyan-400">Zero Black Boxes.</span>
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                Clean, crisp subtitle typography rendered directly on top of your video viewport with drop shadows and custom positioning. Export to SRT, WebVTT, JSON, or burn permanently with hardware-accelerated FFmpeg.
              </p>

              <div className="space-y-3">
                {[
                  'Live Dialogue Tracking synchronized with audio waveforms',
                  'Interactive Timeline Subtitle Editor with instant Undo / Redo',
                  'Instant side-by-side multilingual translation',
                  'One-click FFmpeg hard-sub burn-in with customizable styles',
                  'Short-lived presigned download links for security'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <button
                  onClick={onLaunchStudio}
                  className="btn btn-cyan px-7 py-3 rounded-xl font-bold text-sm shadow-xl shadow-cyan-500/30 transition-all inline-flex items-center gap-2"
                >
                  <Film className="w-4 h-4" />
                  <span>Start Subtitling Now</span>
                </button>
              </div>
            </div>

            {/* Visual Preview Box */}
            <div className="relative rounded-2xl bg-[#090D15] border border-slate-800 p-4 shadow-2xl">
              <div className="rounded-xl overflow-hidden bg-slate-950 aspect-video relative flex items-center justify-center border border-slate-800/80">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                
                {/* Simulated Inside-Video Subtitle */}
                <div className="absolute bottom-6 left-0 right-0 text-center px-4">
                  <div 
                    className="inline-block px-4 py-1.5 text-white font-bold text-lg"
                    style={{
                      fontFamily: 'Outfit, sans-serif',
                      textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)',
                      background: 'transparent'
                    }}
                  >
                    "Experience AI subtitles rendered seamlessly inside the video."
                  </div>
                </div>

                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mx-auto mb-2 text-cyan-400">
                    <Play className="w-6 h-6 fill-cyan-400 ml-1" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Studio Live Viewport</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center text-xs text-slate-500">
        <p className="mb-2">Universal AI Video Subtitle Generator &bull; Multi-User Cloud Platform</p>
        <p>Enterprise Speech Recognition Engine &bull; Secure Multi-Tenant Architecture</p>
      </footer>
    </div>
  );
}
