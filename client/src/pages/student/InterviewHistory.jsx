import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import {
  Bot,
  Award,
  Clock,
  Sparkles,
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Play,
  RotateCcw,
  BarChart2,
  Calendar,
  Layers,
  Video,
  X
} from 'lucide-react';

const InterviewHistory = () => {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    inProgressSessions: 0,
    highestScore: 0,
    avgScore: 0,
    totalPracticeMinutes: 0
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');

  // Video Preview Modal
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('role', search);
      if (difficulty !== 'all') params.append('difficulty', difficulty);
      if (status !== 'all') params.append('status', status);
      if (sort !== 'newest') params.append('sort', sort);

      const res = await api.get(`/interviews/my-sessions?${params.toString()}`);
      setSessions(res.data.sessions || []);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to load interview sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [difficulty, status, sort]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSessions();
  };

  const handleDeleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this mock interview record?')) return;
    try {
      await api.delete(`/interviews/${id}`);
      setSessions(prev => prev.filter(s => s._id !== id));
      fetchSessions();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete session');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '< 1 min';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s > 0 ? `${s}s` : ''}`;
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 60) return 'text-brand-400 bg-brand-500/10 border-brand-500/30';
    return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            AI Mock Interview Archive
          </div>
          <h1 className="text-3xl font-extrabold text-white">Interview Practice Log</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your technical interview progress, review detailed scorecards, and re-watch recorded video rounds.
          </p>
        </div>

        <Link
          to="/interview/setup"
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/30 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Bot className="w-4 h-4" />
          Start New Mock Round
        </Link>
      </div>

      {/* Top Performance Analytics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Bot className="w-4 h-4 text-purple-400" />
            Total Rounds
          </div>
          <div className="text-2xl font-black text-white mt-2">{stats.totalSessions}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{stats.completedSessions} completed</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Award className="w-4 h-4 text-emerald-400" />
            Highest Score
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">
            {stats.highestScore > 0 ? `${stats.highestScore}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Top Evaluation</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <BarChart2 className="w-4 h-4 text-brand-400" />
            Average Score
          </div>
          <div className="text-2xl font-black text-brand-400 mt-2">
            {stats.avgScore > 0 ? `${stats.avgScore}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across completed rounds</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Clock className="w-4 h-4 text-amber-400" />
            Practice Time
          </div>
          <div className="text-2xl font-black text-white mt-2">{stats.totalPracticeMinutes}m</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Active technical voice/code</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Video className="w-4 h-4 text-indigo-400" />
            Recruiter Attached
          </div>
          <div className="text-2xl font-black text-indigo-400 mt-2">
            {sessions.filter(s => s.recordingUrl).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">With recorded video rounds</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by role title (e.g. Full Stack, Frontend, Backend, Go)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs outline-none focus:border-brand-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs outline-none focus:border-brand-500"
            >
              <option value="all">All Difficulties</option>
              <option value="Junior">Junior</option>
              <option value="Mid">Mid Level</option>
              <option value="Senior">Senior</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs outline-none focus:border-brand-500"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs outline-none focus:border-brand-500"
            >
              <option value="newest">Newest First</option>
              <option value="score_desc">Highest Score</option>
              <option value="score_asc">Lowest Score</option>
              <option value="oldest">Oldest First</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Session Cards Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <Bot className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No interview sessions found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Ready to test your skills? Launch an AI-driven technical interview round with live voice and coding questions.
          </p>
          <Link
            to="/interview/setup"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-500 shadow-lg shadow-brand-600/30 transition-all"
          >
            <Bot className="w-4 h-4" /> Start Your First Mock Interview
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map(session => {
            const isCompleted = session.status === 'completed';
            const questionsAnswered = (session.questions || []).filter(q => q.candidateAnswer || q.evaluation?.score).length;

            return (
              <div
                key={session._id}
                className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-brand-500/40 transition-all flex flex-col justify-between group shadow-xl relative"
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteSession(session._id, e)}
                  className="absolute top-5 right-5 text-slate-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete Session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="space-y-4">
                  {/* Top Tags */}
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {session.difficulty} Level
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {isCompleted ? 'Completed' : 'In Progress'}
                    </span>
                  </div>

                  {/* Role Title */}
                  <div>
                    <h2 className="text-lg font-bold text-white group-hover:text-brand-300 transition-colors">
                      {session.role}
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(session.durationSeconds || session.recordingDuration)}
                      </span>
                    </div>
                  </div>

                  {/* Score Display */}
                  {isCompleted ? (
                    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">AI Technical Score</span>
                        <span className={`text-2xl font-black mt-0.5 block ${session.totalScore >= 80 ? 'text-emerald-400' : session.totalScore >= 60 ? 'text-brand-400' : 'text-amber-400'}`}>
                          {session.totalScore}%
                        </span>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <span className="font-bold text-white">{questionsAnswered}</span> / {session.questions?.length || 5} Questions
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-300 text-xs">
                      Session paused at question {questionsAnswered + 1}. You can resume anytime.
                    </div>
                  )}

                  {/* Strengths tags */}
                  {session.topStrengths?.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Key Strengths:</span>
                      <div className="flex flex-wrap gap-1">
                        {session.topStrengths.slice(0, 2).map((str, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            ✓ {str}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recording badge */}
                  {session.recordingUrl && (
                    <button
                      onClick={() => setActiveVideoUrl(session.recordingUrl)}
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold pt-1"
                    >
                      <Play className="w-3.5 h-3.5" /> Watch Recorded Interview Video
                    </button>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
                  {isCompleted ? (
                    <Link
                      to={`/interview/report/${session._id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all"
                    >
                      <Award className="w-4 h-4" />
                      View Full Scorecard <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <Link
                      to={`/interview/room/${session._id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Resume Mock Round
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Modal */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-400" />
                Technical Interview Recording Playback
              </h3>
              <button
                onClick={() => setActiveVideoUrl(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800">
              <video
                src={activeVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveVideoUrl(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
              >
                Close Playback
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InterviewHistory;
