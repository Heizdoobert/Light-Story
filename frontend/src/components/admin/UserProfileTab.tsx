import React, { useState } from 'react';
import { useAuth } from '../../modules/auth/AuthContext';
import { EditUserProfileModal } from './EditUserProfileModal';
import { Mail, User, Shield, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';

export const UserProfileTab: React.FC = () => {
  const { user, profile } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500 dark:text-slate-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EditUserProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">My Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Manage your account information and preferences</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors w-fit"
        >
          <Edit2 size={18} />
          Edit Profile
        </motion.button>
      </header>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        {/* Avatar Section */}
        <div className="relative h-32 bg-gradient-to-r from-primary/20 to-purple-500/20 dark:from-primary/10 dark:to-purple-500/10 flex items-center justify-center">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="flex flex-col items-center gap-3"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-20 h-20 rounded-full border-4 border-white dark:border-slate-900 object-cover shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-500 border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                <User size={32} className="text-white" />
              </div>
            )}
          </motion.div>
        </div>

        <div className="px-8 py-8 space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User size={18} className="text-primary" />
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Full Name</label>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{profile.full_name || 'Not set'}</p>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-primary" />
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email Address</label>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{profile.email || 'Not set'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verified • Primary email</p>
          </div>

          {/* Role */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-primary" />
              <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Account Role</label>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-primary/10 text-primary dark:bg-primary/20">
                {profile.role || 'user'}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {profile.role === 'superadmin' && 'Full system access and all permissions'}
                {profile.role === 'admin' && 'Administrative access with limited permissions'}
                {profile.role === 'employee' && 'Employee access with content management'}
                {profile.role === 'user' && 'Standard user access'}
              </span>
            </div>
          </div>

          {/* User ID */}
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">User ID</label>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 break-all bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg">{profile.id}</p>
          </div>
        </div>
      </motion.div>

      {/* Account Settings Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6"
      >
        <h3 className="font-black text-blue-900 dark:text-blue-300 text-sm uppercase tracking-widest mb-2">Account Information</h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li className="flex items-start gap-2">
            <span className="text-base mt-0.5">•</span>
            <span>Your profile information is stored securely and encrypted</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-base mt-0.5">•</span>
            <span>Changes to your profile will be reflected immediately across the platform</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-base mt-0.5">•</span>
            <span>Your role determines your permissions and access level within the system</span>
          </li>
        </ul>
      </motion.div>
    </div>
  );
};

