import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Key, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Save,
  Layers,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function UserSettings() {
  const { user, authFetch, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  if (!user) return null;

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to update password');
      }

      setSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const usedSec = user.monthly_transcribed_seconds || 0;
  const maxSec = user.max_duration_seconds || 600;
  const quotaPct = Math.min(Math.round((usedSec / maxSec) * 100), 100);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Account Settings</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your cloud tenant profile, authentication security, and compute quotas.
        </p>
      </div>

      <div className="space-y-6">
        
        {/* Profile Details Card */}
        <div className="bg-[#0E131F]/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            <span>Profile Overview</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80">
              <span className="text-slate-400 block mb-1">Full Name</span>
              <span className="text-white font-semibold text-sm">{user.full_name || 'Not provided'}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80">
              <span className="text-slate-400 block mb-1">Email Address</span>
              <span className="text-white font-semibold text-sm">{user.email}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80">
              <span className="text-slate-400 block mb-1">Role / Access</span>
              <span className="text-cyan-400 font-semibold uppercase">{user.role}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80">
              <span className="text-slate-400 block mb-1">Subscription Tier</span>
              <span className="text-indigo-400 font-semibold uppercase">{user.tier} Tier</span>
            </div>
          </div>
        </div>

        {/* Quota Usage Meter */}
        <div className="bg-[#0E131F]/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Monthly Processing Usage</span>
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            AI speech recognition duration consumed during the current monthly billing period.
          </p>

          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-300 font-medium">Used: {usedSec} seconds ({Math.round(usedSec / 60)} min)</span>
            <span className="text-slate-400">Limit: {maxSec} seconds ({Math.round(maxSec / 60)} min)</span>
          </div>

          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                quotaPct > 80 ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
              }`}
              style={{ width: `${quotaPct}%` }}
            />
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-[#0E131F]/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <span>Security & Password</span>
          </h2>

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-emerald flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Password</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
