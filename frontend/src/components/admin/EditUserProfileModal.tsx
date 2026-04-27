import React, { useState, useEffect } from 'react';
import { useAuth } from '../../modules/auth/AuthContext';
import { supabase } from '../../core/supabase';
import { X, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { getErrorMessage } from '../../lib/errorUtils';

interface EditUserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditUserProfileModal: React.FC<EditUserProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { profile, user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [avatarUrlError, setAvatarUrlError] = useState<string | null>(null);

  const validateFullName = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return 'Full name is required';
    if (trimmed.length < 2) return 'Full name must be at least 2 characters';
    if (trimmed.length > 80) return 'Full name must be at most 80 characters';
    return null;
  };

  const validateAvatarUrl = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'Avatar URL must start with http:// or https://';
      }
      return null;
    } catch {
      return 'Avatar URL is not valid';
    }
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setFullNameError(null);
      setAvatarUrlError(null);
    }
  }, [profile, isOpen]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !supabase) return;

    setIsUploadingAvatar(true);
    setAvatarUrlError(null);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      toast.success('Avatar uploaded successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const nextFullNameError = validateFullName(fullName);
    const nextAvatarUrlError = validateAvatarUrl(avatarUrl);

    setFullNameError(nextFullNameError);
    setAvatarUrlError(nextAvatarUrlError);

    if (nextFullNameError || nextAvatarUrlError) {
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim() || null,
      });

      toast.success('Profile updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(getErrorMessage(error, 'update_profile'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">Edit Profile</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Avatar Section */}
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Profile Picture</label>
                  <div className="flex items-center gap-4">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-500 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        <span className="text-xs font-black text-white">AVATAR</span>
                      </div>
                    )}
                    <label className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        id="profile-avatar-upload"
                        onChange={handleAvatarUpload}
                        disabled={isUploadingAvatar}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('profile-avatar-upload')?.click()}
                        disabled={isUploadingAvatar}
                        className="w-full px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-primary dark:hover:border-primary transition-colors text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary disabled:opacity-50"
                      >
                        {isUploadingAvatar ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader size={16} className="animate-spin" />
                            Uploading...
                          </div>
                        ) : (
                          'Change Avatar'
                        )}
                      </button>
                    </label>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                      fullNameError ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  {fullNameError && (
                    <p className="text-xs font-semibold text-red-500">{fullNameError}</p>
                  )}
                </div>

                {/* Avatar URL */}
                <div className="space-y-2">
                  <label htmlFor="avatarUrl" className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Avatar URL (Optional)
                  </label>
                  <input
                    id="avatarUrl"
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                      avatarUrlError ? 'border-red-400 dark:border-red-500' : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                  {avatarUrlError && (
                    <p className="text-xs font-semibold text-red-500">{avatarUrlError}</p>
                  )}
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Email Address (Cannot be changed)
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 focus:outline-none transition-colors cursor-not-allowed"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || isUploadingAvatar}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

