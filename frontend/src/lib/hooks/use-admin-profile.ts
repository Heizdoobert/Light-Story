"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/lib/hooks/use-user";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { updateUserProfile } from "@/lib/actions/user.actions";
import { getErrorMessage } from "@/lib/utils/error-utils";

export function useAdminProfile() {
  const { user, profile, role, isLoading, signOut } = useUser();

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const handleUpdateProfile = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) {
        toast.error("Bạn chưa đăng nhập");
        return;
      }

      setSaving(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (error) {
          const actionRes = await updateUserProfile(user.id, {
            full_name: fullName,
            avatar_url: avatarUrl,
          });
          if (!actionRes.success) throw new Error(actionRes.error);
        }

        toast.success("Cập nhật thông tin tài khoản thành công!");
      } catch (err) {
        toast.error(getErrorMessage(err) || "Cập nhật hồ sơ thất bại");
      } finally {
        setSaving(false);
      }
    },
    [user, fullName, avatarUrl]
  );

  return {
    user,
    profile,
    role,
    isLoading,
    fullName,
    setFullName,
    avatarUrl,
    setAvatarUrl,
    saving,
    handleUpdateProfile,
    signOut,
  };
}
