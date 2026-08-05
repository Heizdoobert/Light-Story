"use client";

import React from "react";
import { EditUserProfileModal } from "@/components/user/EditUserProfileModal";
import { Mail, User, Edit2, Clock, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { sanitizeImageUrl, getFallbackAvatar, proxyAvatarUrl } from "@/lib/auth/securityUtils";
import { Header } from "@/components/navigation/Header";
import { LoginModal } from "@/components/auth/LoginModal";
import { AdZone } from "@/components/shared/ads/AdZone";
import { useProfilePresenter } from "@/hooks/presenters/useProfilePresenter";
import { useAuth } from "@/context/AuthContext";

const details = (profile: NonNullable<ReturnType<typeof useAuth>["profile"]>) => [
  { icon: Mail, label: "Email", value: profile.email },
  { icon: User, label: "Full Name", value: profile.full_name || "Not set" },
  { icon: CheckCircle, label: "Status", value: "Active" },
  ...(profile.created_at
    ? [
        {
          icon: Clock as typeof Clock,
          label: "Member Since",
          value: new Date(profile.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      ]
    : []),
];

export const ProfilePageContent: React.FC = () => {
  const {
    user,
    profile,
    isEditModalOpen,
    setIsEditModalOpen,
    isLoginModalOpen,
    setIsLoginModalOpen,
  } = useProfilePresenter();

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
        <Header onLoginClick={() => setIsLoginModalOpen(true)} />
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
              <User size={28} className="text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Not signed in</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Sign in to view and manage your profile.</p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <Header onLoginClick={() => setIsLoginModalOpen(true)} />

      <div className="flex-1 w-full px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <EditUserProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
          >
            <div className="relative h-36 bg-gradient-to-br from-primary/20 to-purple-500/20 dark:from-primary/10 dark:to-purple-500/10">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditModalOpen(true)}
                className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-slate-900 dark:text-white rounded-xl font-bold text-sm shadow-sm hover:bg-white dark:hover:bg-slate-900 transition-all"
              >
                <Edit2 size={15} />
                Edit
              </motion.button>
            </div>

            <div className="px-8 pb-8">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 mb-8">
                {profile.avatar_url && sanitizeImageUrl(profile.avatar_url) ? (
                  <img
                    src={proxyAvatarUrl(profile.avatar_url) || undefined}
                    alt="Avatar"
                    className="w-20 h-20 rounded-2xl border-4 border-white dark:border-slate-900 object-cover shadow-lg"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getFallbackAvatar(profile?.full_name || "User");
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-purple-500 border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-lg shrink-0">
                    <User size={32} className="text-white" />
                  </div>
                )}
                <div className="pb-1">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white">{profile.full_name || "User"}</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{profile.email}</p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {details(profile).map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
                      <p className="font-bold text-slate-900 dark:text-white">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="xl:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 w-full">
            <AdZone zoneId="profile-zone2-left-mobile" format="rectangle" label="Zone 2 - Trái" />
            <AdZone zoneId="profile-zone2-right-mobile" format="rectangle" label="Zone 2 - Phải" />
          </div>
        </div>
      </div>
    </div>
  );
};
