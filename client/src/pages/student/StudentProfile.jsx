import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Github,
  Linkedin,
  Globe,
  Save,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Shield,
  Camera,
  Trash2,
  Upload,
  BookOpen,
  Calendar,
  Star
} from 'lucide-react';

const StudentProfile = () => {
  const { user, updateUserProfile, logout } = useAuth();

  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    location: '',
    bio: '',
    title: '',
    college: '',
    graduationYear: '',
    cgpa: '',
    githubUrl: '',
    linkedinUrl: '',
    portfolioUrl: '',
    avatar: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
        location: user.location || '',
        bio: user.bio || '',
        title: user.title || '',
        college: user.college || '',
        graduationYear: user.graduationYear || '',
        cgpa: user.cgpa || '',
        githubUrl: user.githubUrl || '',
        linkedinUrl: user.linkedinUrl || '',
        portfolioUrl: user.portfolioUrl || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setProfileMsg({ type: '', text: '' });
    try {
      await updateUserProfile(profileData);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
      setTimeout(() => setProfileMsg({ type: '', text: '' }), 4000);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    setChangingPassword(true);
    setPasswordMsg({ type: '', text: '' });
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully! Please log in again.' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => logout(), 3000);
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Avatar must be under 2MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileData(prev => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const tabs = [
    { id: 'profile', label: 'Profile Info', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Account Settings
          </div>
          <h1 className="text-3xl font-extrabold text-white">My Profile</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your personal info, academic details and security settings.</p>
        </div>
      </div>

      {/* Profile Card Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-brand-950/30 to-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar */}
        <div className="relative group flex-shrink-0">
          {profileData.avatar ? (
            <img
              src={profileData.avatar}
              alt={profileData.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-500 shadow-lg"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-brand-500/10 border-2 border-brand-500/30 flex items-center justify-center">
              <User className="w-9 h-9 text-brand-400" />
            </div>
          )}
          <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Camera className="w-5 h-5 text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>
          {profileData.avatar && (
            <button
              onClick={() => setProfileData(prev => ({ ...prev, avatar: '' }))}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3 h-3 text-white" />
            </button>
          )}
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">{user?.name}</h2>
          <p className="text-sm text-slate-400">{user?.email}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20 capitalize">
              {user?.role}
            </span>
            {user?.college && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                {user.college}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-400 bg-brand-500/5'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB: Profile Info */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="space-y-6">

          {/* Basic Info */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <User className="w-4 h-4 text-brand-400" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Full Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  required
                  value={profileData.name}
                  onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-brand-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-500 text-xs cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone Number
                </label>
                <input
                  type="text"
                  value={profileData.phone}
                  onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Location (City, State)
                </label>
                <input
                  type="text"
                  value={profileData.location}
                  onChange={e => setProfileData(p => ({ ...p, location: e.target.value }))}
                  placeholder="Bangalore, Karnataka"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Professional Title / Headline</label>
                <input
                  type="text"
                  value={profileData.title}
                  onChange={e => setProfileData(p => ({ ...p, title: e.target.value }))}
                  placeholder="Full Stack Developer | React & Node.js Enthusiast"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Bio / About Me</label>
                <textarea
                  rows={3}
                  value={profileData.bio}
                  onChange={e => setProfileData(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Brief description about yourself, your interests and goals..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-brand-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Academic Info */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              Academic Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> College / University
                </label>
                <input
                  type="text"
                  value={profileData.college}
                  onChange={e => setProfileData(p => ({ ...p, college: e.target.value }))}
                  placeholder="GLA University, Mathura"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Graduation Year
                </label>
                <input
                  type="text"
                  value={profileData.graduationYear}
                  onChange={e => setProfileData(p => ({ ...p, graduationYear: e.target.value }))}
                  placeholder="2026"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Star className="w-3 h-3" /> CGPA / Percentage
                </label>
                <input
                  type="text"
                  value={profileData.cgpa}
                  onChange={e => setProfileData(p => ({ ...p, cgpa: e.target.value }))}
                  placeholder="9.1 / 10.0"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Social & Links */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Globe className="w-4 h-4 text-purple-400" />
              Social & Portfolio Links
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Github className="w-3 h-3" /> GitHub URL
                </label>
                <input
                  type="url"
                  value={profileData.githubUrl}
                  onChange={e => setProfileData(p => ({ ...p, githubUrl: e.target.value }))}
                  placeholder="https://github.com/username"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Linkedin className="w-3 h-3" /> LinkedIn URL
                </label>
                <input
                  type="url"
                  value={profileData.linkedinUrl}
                  onChange={e => setProfileData(p => ({ ...p, linkedinUrl: e.target.value }))}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Portfolio / Website URL
                </label>
                <input
                  type="url"
                  value={profileData.portfolioUrl}
                  onChange={e => setProfileData(p => ({ ...p, portfolioUrl: e.target.value }))}
                  placeholder="https://myportfolio.dev"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Profile Message */}
          {profileMsg.text && (
            <div className={`flex items-center gap-2 p-3.5 rounded-xl text-xs font-semibold ${
              profileMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}>
              {profileMsg.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              {profileMsg.text}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}

      {/* TAB: Security */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <form onSubmit={handlePasswordChange} className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Lock className="w-4 h-4 text-amber-400" />
              Change Password
            </h3>

            <div className="space-y-4">
              {[
                { label: 'Current Password', key: 'currentPassword', show: showCurrent, toggle: () => setShowCurrent(p => !p) },
                { label: 'New Password', key: 'newPassword', show: showNew, toggle: () => setShowNew(p => !p) },
                { label: 'Confirm New Password', key: 'confirmPassword', show: showConfirm, toggle: () => setShowConfirm(p => !p) }
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs text-slate-400 mb-1">{field.label}</label>
                  <div className="relative">
                    <input
                      type={field.show ? 'text' : 'password'}
                      required
                      value={passwordData[field.key]}
                      onChange={e => setPasswordData(p => ({ ...p, [field.key]: e.target.value }))}
                      className="w-full px-3 py-2.5 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-brand-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={field.toggle}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
              ⚠️ After changing your password, you'll be automatically logged out and must sign in again with the new password.
            </div>

            {passwordMsg.text && (
              <div className={`flex items-center gap-2 p-3.5 rounded-xl text-xs font-semibold ${
                passwordMsg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                {passwordMsg.type === 'success'
                  ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                {passwordMsg.text}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changingPassword}
                className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>

          {/* Account Info Panel */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Shield className="w-4 h-4 text-indigo-400" />
              Account Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <p className="text-slate-400 font-medium mb-1">Account Email</p>
                <p className="text-white font-semibold">{user?.email}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <p className="text-slate-400 font-medium mb-1">Account Role</p>
                <p className="text-white font-semibold capitalize">{user?.role}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <p className="text-slate-400 font-medium mb-1">Member Since</p>
                <p className="text-white font-semibold">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <p className="text-slate-400 font-medium mb-1">Authentication</p>
                <p className="text-emerald-400 font-semibold">OTP Email Verified ✓</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentProfile;
