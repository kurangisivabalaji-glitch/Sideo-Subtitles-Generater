import React, { useState, useEffect, useRef } from 'react';
import { 
  Film, 
  Search, 
  Filter, 
  RotateCcw, 
  XCircle, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  FileText,
  FileCode,
  Flame
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatPreciseTime } from '../utils/timeUtils';

export function QueueHistory({ onOpenJobInStudio }) {
  const { user, authFetch, token, apiBase } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const pollTimerRef = useRef(null);

  const fetchJobs = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      let url = `/api/jobs?page=${page}&size=20`;
      if (statusFilter !== 'ALL') {
        url += `&status_filter=${statusFilter}`;
      }
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setTotalJobs(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [user, page, statusFilter]);

  // Periodic poll if any job is currently QUEUED or PROCESSING
  useEffect(() => {
    const hasActiveJob = jobs.some(j => j.status === 'QUEUED' || j.status === 'PROCESSING');
    if (hasActiveJob) {
      pollTimerRef.current = setInterval(() => {
        fetchJobs();
      }, 3000);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [jobs]);

  const handleCancel = async (jobId) => {
    setActionLoadingId(jobId);
    try {
      const res = await authFetch(`/api/jobs/${jobId}/cancel`, { method: 'POST' });
      if (res.ok) {
        fetchJobs();
      }
    } catch (err) {
      console.error('Cancel failed:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRetry = async (jobId) => {
    setActionLoadingId(jobId);
    try {
      const res = await authFetch(`/api/jobs/${jobId}/retry`, { method: 'POST' });
      if (res.ok) {
        fetchJobs();
      }
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDirectDownload = async (jobId, format) => {
    try {
      const res = await authFetch(`/api/export/${jobId}/${format}`);
      if (!res.ok) throw new Error(`Download ${format} failed`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subtitles_${jobId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
            <span>Job Queue & Subtitle History</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {totalJobs} Jobs
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time queue monitoring, worker stage telemetry, and multi-format subtitle exports.
          </p>
        </div>

        <button
          onClick={() => { setLoading(true); fetchJobs(); }}
          className="self-start md:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl btn btn-soft-cyan text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0E131F]/90 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-3 items-center justify-between shadow-lg">
        
        {/* Status Filters */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {[
            { id: 'ALL', label: '✦ All Jobs', activeCls: 'btn-all', idleCls: 'btn-soft-all' },
            { id: 'PROCESSING', label: 'In Progress', activeCls: 'btn-cyan', idleCls: 'btn-soft-cyan' },
            { id: 'QUEUED', label: 'Queued', activeCls: 'btn-amber', idleCls: 'btn-soft-amber' },
            { id: 'COMPLETED', label: 'Completed', activeCls: 'btn-emerald', idleCls: 'btn-soft-emerald' },
            { id: 'FAILED', label: 'Failed', activeCls: 'btn-rose', idleCls: 'btn-soft-rose' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => { setStatusFilter(f.id); setPage(1); }}
              className={`btn px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === f.id ? f.activeCls : f.idleCls
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by video title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchJobs(); }}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

      </div>

      {/* Queue Table */}
      <div className="bg-[#0E131F]/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-cyan-400" />
            <span className="text-sm">Fetching queue data...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-20 text-center px-4">
            <Film className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <h3 className="text-sm font-semibold text-white">No jobs match your filter</h3>
            <p className="text-xs text-slate-400 mt-1">Upload a video in the Studio to start transcription.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Video Details</th>
                  <th className="py-3.5 px-4">Language & Model</th>
                  <th className="py-3.5 px-4">Status & Progress</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {jobs.map((job) => {
                  const isBusy = actionLoadingId === job.id;
                  const isRunning = job.status === 'PROCESSING' || job.status === 'QUEUED';

                  return (
                    <tr key={job.id} className="hover:bg-slate-900/40 transition-colors">
                      {/* Video Details */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 flex-shrink-0">
                            <Film className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white max-w-[200px] truncate" title={job.video?.title}>
                              {job.video?.title || 'Video Title'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {job.video?.duration ? formatPreciseTime(job.video.duration) : '--:--'} &bull; {job.video?.video_codec || 'MP4'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Language & Model */}
                      <td className="py-4 px-4">
                        <div className="text-slate-200 font-semibold">
                          {job.detected_language ? job.detected_language.toUpperCase() : job.requested_language.toUpperCase()}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Model: <span className="text-cyan-400">{job.model_size}</span>
                        </div>
                      </td>

                      {/* Status & Progress */}
                      <td className="py-4 px-4 min-w-[220px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            job.status === 'COMPLETED' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40' :
                            job.status === 'PROCESSING' ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800/40' :
                            job.status === 'QUEUED' ? 'bg-indigo-950/80 text-indigo-400 border-indigo-800/40' :
                            'bg-rose-950/80 text-rose-400 border-rose-800/40'
                          }`}>
                            {job.status}
                          </span>
                          {isRunning && (
                            <span className="text-[11px] text-cyan-400 font-mono font-bold">
                              {job.progress}%
                            </span>
                          )}
                        </div>

                        {isRunning && (
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                            <div 
                              className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                              style={{ width: `${Math.max(job.progress, 5)}%` }}
                            />
                          </div>
                        )}

                        <div className="text-[11px] text-slate-400 mt-1 truncate max-w-[260px]" title={job.stage}>
                          {job.error_message ? (
                            <span className="text-rose-400">{job.error_message}</span>
                          ) : (
                            job.stage || 'Ready'
                          )}
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(job.created_at).toLocaleDateString()} {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {job.status === 'COMPLETED' && (
                            <>
                              <button
                                onClick={() => onOpenJobInStudio(job)}
                                className="btn btn-soft-cyan flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                title="Open in Studio"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Studio</span>
                              </button>

                              <button
                                onClick={() => handleDirectDownload(job.id, 'srt')}
                                className="btn btn-soft-emerald p-1.5 rounded-lg"
                                title="Download SRT"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDirectDownload(job.id, 'vtt')}
                                className="btn btn-soft-purple p-1.5 rounded-lg"
                                title="Download VTT"
                              >
                                <FileCode className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {isRunning && (
                            <button
                              onClick={() => handleCancel(job.id)}
                              disabled={isBusy}
                              className="btn btn-soft-rose flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancel</span>
                            </button>
                          )}

                          {(job.status === 'FAILED' || job.status === 'CANCELLED') && (
                            <button
                              onClick={() => handleRetry(job.id)}
                              disabled={isBusy}
                              className="btn btn-soft-amber flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                            >
                              <RotateCcw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
