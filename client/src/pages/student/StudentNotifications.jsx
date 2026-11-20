import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import {
  Bell,
  CheckCircle2,
  Briefcase,
  Bot,
  Award,
  Sparkles,
  Trash2,
  CheckCheck,
  Clock,
  ArrowRight,
  Filter,
  Inbox
} from 'lucide-react';

const StudentNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, application_status, interview_complete
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;
    setActionLoading(true);
    try {
      await api.delete('/notifications/clear-all');
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'application_status':
        return <Briefcase className="w-5 h-5 text-brand-400" />;
      case 'interview_complete':
        return <Bot className="w-5 h-5 text-purple-400" />;
      case 'dossier_shared':
        return <Award className="w-5 h-5 text-emerald-400" />;
      case 'new_job_match':
        return <Sparkles className="w-5 h-5 text-amber-400" />;
      default:
        return <Bell className="w-5 h-5 text-brand-400" />;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'application_status') return n.type === 'application_status';
    if (filter === 'interview_complete') return n.type === 'interview_complete';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-2">
            <Bell className="w-3.5 h-3.5" />
            Notification Center
          </div>
          <h1 className="text-3xl font-extrabold text-white">Activity & Alerts</h1>
          <p className="text-sm text-slate-400 mt-1">
            Stay updated with your job application status changes and mock interview scorecards.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'all', label: 'All Alerts', count: notifications.length },
          { id: 'unread', label: 'Unread', count: unreadCount },
          { id: 'application_status', label: 'Applications', count: notifications.filter(n => n.type === 'application_status').length },
          { id: 'interview_complete', label: 'Interviews', count: notifications.filter(n => n.type === 'interview_complete').length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filter === tab.id
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No notifications in this filter</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {filter === 'unread'
              ? 'You are all caught up! No unread notifications.'
              : 'Notifications about your placement applications and mock interviews will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map(notification => (
            <div
              key={notification._id}
              onClick={() => handleMarkAsRead(notification._id)}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 group cursor-pointer ${
                notification.isRead
                  ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  : 'bg-gradient-to-r from-slate-900 via-brand-950/20 to-slate-900 border-brand-500/30 hover:border-brand-500/50 shadow-md'
              }`}
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  notification.isRead
                    ? 'bg-slate-800 border border-slate-700'
                    : 'bg-brand-500/10 border border-brand-500/30'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold truncate ${notification.isRead ? 'text-slate-300' : 'text-white'}`}>
                      {notification.title}
                    </h3>
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand-400 flex-shrink-0 animate-pulse" />
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {notification.message}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(notification.createdAt)}
                    </span>

                    {notification.link && (
                      <Link
                        to={notification.link}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 font-semibold text-brand-400 hover:text-brand-300"
                      >
                        View Details <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Delete Action */}
              <button
                onClick={(e) => handleDelete(notification._id, e)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all"
                title="Delete notification"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default StudentNotifications;
