import React from 'react';
import { 
  Sparkles, 
  Film, 
  LayoutDashboard, 
  ListOrdered, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Clock, 
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function UserNav({ activeView, setActiveView }) {
  const { user, logout, openLogin, openRegister } = useAuth();

  // Calculate monthly quota percentage
  const maxSec = user?.max_duration_seconds || 600;
  const usedSec = user?.monthly_transcribed_seconds || 0;
  const quotaPct = Math.min(Math.round((usedSec / maxSec) * 100), 100);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0B0F17]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Tag */}
        <div 
          onClick={() => setActiveView('dashboard')}
          className="flex items-center gap-3 cursor-pointer group flex-shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1.5px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
            <div className="w-full h-full bg-[#0E131F] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                Universal AI Subtitles
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
                Cloud
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block -mt-0.5">
              Multi-User Speech Platform
            </span>
          </div>
        </div>

        {/* Center Navigation Links - Richly colored for Studio, Dashboard, History, Admin */}
        <nav className="flex items-center gap-2 p-1 rounded-xl bg-slate-950/80 border border-slate-800 shadow-inner">
          {/* Studio Button - Cyan Theme */}
          <button
            onClick={() => setActiveView('studio')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeView === 'studio'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/40 border border-cyan-300 ring-1 ring-cyan-400 scale-[1.02]'
                : 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/70 hover:bg-cyan-900/80 hover:text-white hover:border-cyan-400 hover:shadow-md hover:shadow-cyan-900/40'
            }`}
          >
            <Film className={`w-3.5 h-3.5 ${activeView === 'studio' ? 'text-white' : 'text-cyan-400'}`} />
            <span>Studio</span>
          </button>

          {/* Dashboard Button - Emerald Theme */}
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeView === 'dashboard'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/40 border border-emerald-300 ring-1 ring-emerald-400 scale-[1.02]'
                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/70 hover:bg-emerald-900/80 hover:text-white hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-900/40'
            }`}
          >
            <LayoutDashboard className={`w-3.5 h-3.5 ${activeView === 'dashboard' ? 'text-white' : 'text-emerald-400'}`} />
            <span>Dashboard</span>
          </button>

          {/* Queue & History Button - Purple Theme */}
          <button
            onClick={() => setActiveView('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeView === 'history'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/40 border border-purple-300 ring-1 ring-purple-400 scale-[1.02]'
                : 'bg-purple-950/60 text-purple-300 border border-purple-800/70 hover:bg-purple-900/80 hover:text-white hover:border-purple-400 hover:shadow-md hover:shadow-purple-900/40'
            }`}
          >
            <ListOrdered className={`w-3.5 h-3.5 ${activeView === 'history' ? 'text-white' : 'text-purple-400'}`} />
            <span>Queue & History</span>
          </button>

          {/* Admin Portal Button - Amber Theme */}
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveView('admin')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeView === 'admin'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-amber-500/40 border border-amber-300 ring-1 ring-amber-400 scale-[1.02]'
                  : 'bg-amber-950/60 text-amber-300 border border-amber-800/70 hover:bg-amber-900/80 hover:text-white hover:border-amber-400 hover:shadow-md hover:shadow-amber-900/40'
              }`}
            >
              <ShieldAlert className={`w-3.5 h-3.5 ${activeView === 'admin' ? 'text-white' : 'text-amber-400'}`} />
              <span>Admin Portal</span>
            </button>
          )}
        </nav>

        {/* Right User Actions / Auth Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Quota Progress (Free Tier) */}
              {user.tier !== 'unlimited' && user.role !== 'admin' && (
                <div className="hidden lg:flex flex-col items-end text-right">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{usedSec}s / {maxSec}s used</span>
                  </div>
                  <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        quotaPct > 80 ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                      }`}
                      style={{ width: `${quotaPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* User Badge */}
              <div 
                onClick={() => setActiveView('settings')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all"
                title="Account Settings"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-medium text-white truncate max-w-[110px]">
                    {user.full_name || user.email.split('@')[0]}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-cyan-400">
                    {user.role === 'admin' ? 'Administrator' : `${user.tier} tier`}
                  </div>
                </div>
              </div>

              {/* Settings Action */}
              <button
                onClick={() => setActiveView('settings')}
                className="p-2 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition-colors"
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Logout */}
              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={openLogin}
                className="btn btn-soft-cyan flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>

              <button
                onClick={openRegister}
                className="btn btn-cyan flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-cyan-500/30"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up Free</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
