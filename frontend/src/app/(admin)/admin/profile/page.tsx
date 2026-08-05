"use client";

import { User, ShieldCheck, Mail, Calendar, LogOut, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/admin/image-uploader";
import { getR2ImageUrl } from "@/lib/utils/image-url";
import { useAdminProfile } from "@/lib/hooks/use-admin-profile";

export default function AdminProfilePage() {
  const {
    user,
    role,
    isLoading,
    fullName,
    setFullName,
    avatarUrl,
    setAvatarUrl,
    saving,
    handleUpdateProfile,
    signOut,
  } = useAdminProfile();

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Đang tải thông tin tài khoản admin...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <User className="text-orange-500" size={28} />
            Hồ Sơ Tài Khoản Cá Nhân
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý thông tin tài khoản quản trị viên và phiên làm việc hiện tại
          </p>
        </div>
        <Button
          onClick={signOut}
          variant="danger"
          className="gap-2 shrink-0 font-bold"
        >
          <LogOut size={16} /> Đăng Xuất Quản Trị
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card Summary */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-6 text-center">
          <div className="relative w-28 h-28 mx-auto rounded-full overflow-hidden border-2 border-orange-500/50 bg-slate-950 flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={getR2ImageUrl(avatarUrl)}
                alt={fullName || "Admin Avatar"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span className="text-4xl font-black text-orange-400">
                {fullName ? fullName[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : "A"}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">{fullName || "Admin User"}</h2>
            <p className="text-xs text-slate-400 font-mono">{user?.email || "admin@lightstory.app"}</p>
            <div className="pt-2">
              <Badge variant={role === "superadmin" ? "danger" : "warning"}>
                {role ? role.toUpperCase() : "ADMIN"}
              </Badge>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 space-y-2 text-left text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-slate-500" />
              <span>Email: <strong className="text-slate-200">{user?.email}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-slate-500" />
              <span>ID Tài khoản: <strong className="text-slate-200 font-mono text-[11px]">{user?.id?.slice(0, 18)}...</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-500" />
              <span>Đăng nhập gần nhất: <strong className="text-slate-200">{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("vi-VN") : "Hôm nay"}</strong></span>
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="font-bold text-lg border-b border-slate-800 pb-3">Cập Nhật Thông Tin Cá Nhân</h3>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Họ và Tên *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên admin..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tải Lên Ảnh Đại Diện Mới (Cloudflare R2 Storage)
              </label>
              <ImageUploader
                folder="avatars"
                onImagesUploaded={(urls) => {
                  if (urls.length > 0) setAvatarUrl(urls[0]);
                }}
              />
              {avatarUrl && (
                <p className="text-[11px] text-orange-400 mt-1 truncate">Đường dẫn R2: {avatarUrl}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Địa Chỉ Email (Cố định)</label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Vai Trò Hệ Thống (Role)</label>
              <input
                type="text"
                disabled
                value={role || "user"}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed capitalize"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 font-bold gap-2"
              >
                <Save size={16} /> {saving ? "Đang lưu..." : "Lưu Thay Đổi Hồ Sơ"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
