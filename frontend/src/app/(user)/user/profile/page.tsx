"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User, Mail, Calendar, Shield, Bookmark, History, Save, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/admin/image-uploader";
import { useUser } from "@/lib/hooks/use-user";
import { updateUserProfile } from "@/lib/actions/user.actions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getR2ImageUrl } from "@/lib/utils/image-url";
import { toast } from "sonner";

export default function UserProfilePage() {
  const { user, profile, role, isLoading, signOut } = useUser();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Bạn chưa đăng nhập");
      return;
    }
    setIsSaving(true);
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
        const res = await updateUserProfile(user.id, { full_name: fullName, avatar_url: avatarUrl });
        if (!res.success) throw new Error(res.error);
      }

      toast.success("Cập nhật thông tin tài khoản thành công!");
    } catch (err: any) {
      toast.error(err.message || "Cập nhật tài khoản thất bại");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse max-w-4xl mx-auto">
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Chưa Đăng Nhập</h1>
        <p className="text-sm text-slate-500">Vui lòng đăng nhập để xem thông tin cá nhân.</p>
        <Link href="/auth/login">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold">Đăng Nhập Ngay</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <User className="text-orange-500" size={28} />
            Hồ Sơ Cá Nhân
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý thông tin tài khoản, ảnh đại diện và cài đặt cá nhân
          </p>
        </div>
        <Button
          onClick={signOut}
          variant="danger"
          className="gap-2 shrink-0 font-bold"
        >
          <LogOut size={16} /> Đăng Xuất
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Card Summary */}
        <Card className="p-6 text-center space-y-6">
          <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden border-2 border-orange-500/50 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-md">
            {avatarUrl ? (
              <img
                src={getR2ImageUrl(avatarUrl)}
                alt={fullName || "User Avatar"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span className="text-4xl font-black text-orange-500">
                {fullName ? fullName[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : "U"}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{fullName || "Người dùng"}</h2>
            <p className="text-xs text-slate-500 font-mono">{user.email}</p>
            <div className="pt-2">
              <Badge variant={role === "superadmin" || role === "admin" ? "warning" : "default"}>
                {role ? role.toUpperCase() : "USER"}
              </Badge>
            </div>
          </div>

          {/* Quick Links */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/user/bookmarks"
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 font-bold transition-all flex flex-col items-center gap-1"
            >
              <Bookmark size={18} />
              <span>Tủ Sách</span>
            </Link>
            <Link
              href="/user/history"
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500 font-bold transition-all flex flex-col items-center gap-1"
            >
              <History size={18} />
              <span>Lịch Sử Đọc</span>
            </Link>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2 text-left text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-slate-400" />
              <span>Email: <strong className="text-slate-800 dark:text-slate-200">{user.email}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-slate-400" />
              <span>ID Tài khoản: <strong className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">{user.id.slice(0, 16)}...</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <span>Ngày tham gia: <strong className="text-slate-800 dark:text-slate-200">{user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "Hôm nay"}</strong></span>
            </div>
          </div>
        </Card>

        {/* Edit Form */}
        <Card className="lg:col-span-2 p-6 space-y-6">
          <h3 className="font-bold text-lg border-b border-slate-200 dark:border-slate-800 pb-3 text-slate-900 dark:text-slate-100">
            Cập Nhật Thông Tin Cá Nhân
          </h3>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Họ và Tên *</label>
              <Input
                type="text"
                required
                placeholder="Nhập họ và tên..."
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tải Lên Ảnh Đại Diện (Cloudflare R2 Storage)
              </label>
              <ImageUploader
                folder="avatars"
                onImagesUploaded={(urls) => {
                  if (urls.length > 0) setAvatarUrl(urls[0]);
                }}
              />
              {avatarUrl && (
                <p className="text-[11px] text-orange-500 mt-1 truncate">Đường dẫn ảnh R2: {avatarUrl}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">Địa Chỉ Email (Cố định)</label>
              <Input
                type="email"
                disabled
                value={user.email || ""}
                className="bg-slate-100 dark:bg-slate-800/60 cursor-not-allowed text-slate-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={isSaving} className="bg-orange-500 hover:bg-orange-600 font-bold gap-2 text-white">
                <Save size={16} /> {isSaving ? "Đang lưu..." : "Lưu Thay Đổi"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
