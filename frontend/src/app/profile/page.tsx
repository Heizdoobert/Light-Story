"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import {
  Camera,
  Mail,
  Shield,
  User as UserIcon,
  Save,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/modules/auth/AuthContext";
import { userService } from "@/services/userService.service"; // 👉 Import Service vừa tạo
import { toast } from "sonner";
import Link from "next/link";

export default function ProfilePage() {
  const { user, profile, role, updateProfile, loading } = useAuth();

  // State quản lý form
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Đồng bộ dữ liệu từ Context vào form khi load trang xong
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  // Xử lý chọn ảnh đại diện mới thông qua Service
  const handleAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Giới hạn dung lượng file tránh quá tải (Ví dụ: tối đa 3MB)
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Kích thước ảnh phải nhỏ hơn 3MB!");
      return;
    }

    // 1. Tạo URL xem trước ngay lập tức cho mượt giao diện
    const objectUrl = URL.createObjectURL(file);
    setPreviewAvatar(objectUrl);

    // 2. Tiến hành gọi Service để upload file
    try {
      toast.info("Đang tải ảnh lên hệ thống...");

      // 👉 Sử dụng userService đã được tách lớp chuyên nghiệp
      const uploadedUrl = await userService.uploadAvatar(file);

      setAvatarUrl(uploadedUrl);
      toast.success("Tải ảnh lên thành công! Bấm 'Lưu thay đổi' để hoàn tất.");
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải ảnh lên. Vui lòng thử lại!");
      setPreviewAvatar(null); // Hoàn tác nếu lỗi
    }
  };

  // Xử lý khi bấm nút "Lưu thay đổi"
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Tên hiển thị không được để trống!");
      return;
    }

    setIsSaving(true);
    try {
      // Gọi hàm updateProfile từ AuthContext (được bảo vệ bởi trigger SQL an toàn)
      await updateProfile({
        full_name: fullName.trim(),
        avatar_url: avatarUrl,
      });
      toast.success("Cập nhật thông tin thành công!");
      setPreviewAvatar(null); // Xóa trạng thái preview sau khi lưu thành công vào DB
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Có lỗi xảy ra khi lưu thay đổi!");
    } finally {
      setIsSaving(false);
    }
  };

  // Màn hình chờ khi đang load AuthContext
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  // Hiển thị ảnh ưu tiên theo thứ tự: Preview mới chọn -> Ảnh trong DB -> Ảnh mặc định theo tên
  const displayAvatar =
    previewAvatar ||
    avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || "User")}&background=random`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Nút quay lại trang chủ & Tiêu đề */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              Trang cá nhân
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">
              Quản lý thông tin và tài khoản thành viên của bạn
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ArrowLeft size={16} /> Về trang chủ
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-xl overflow-hidden relative"
        >
          {/* Ảnh bìa (Cover Photo) */}
          <div className="h-44 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 relative">
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          <form onSubmit={handleSave} className="px-6 sm:px-10 pb-10">
            {/* KHU VỰC AVATAR & QUYỀN HẠN (Nằm đè lên ảnh bìa) */}
            <div className="relative -mt-16 mb-8 flex justify-between items-end">
              <div className="relative group">
                {/* Khung chứa ảnh đại diện */}
                <div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-900 shadow-xl overflow-hidden bg-slate-200 dark:bg-slate-800 relative z-10">
                  <img
                    src={displayAvatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />

                  {/* Nút overlay khi hover chuột vào để đổi ảnh */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                  >
                    <Camera size={24} className="mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Đổi ảnh
                    </span>
                  </div>
                </div>

                {/* Thẻ input chọn file ẩn */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />
              </div>

              {/* Huy hiệu hiển thị Role của tài khoản */}
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-wider border border-blue-200 dark:border-blue-500/25 shadow-sm">
                  <Shield size={14} />
                  {role || "Thành viên"}
                </span>
              </div>
            </div>

            {/* FORM THÔNG TIN CHI TIẾT */}
            <div className="space-y-6">
              {/* Email (Bị khóa theo đúng quy tắc bảo mật từ Database Trigger) */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
                  Địa chỉ Email (Cố định)
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="w-full bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-semibold cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-slate-400 ml-2 font-medium">
                  Email được bảo mật bởi hệ thống và không thể thay đổi trực
                  tiếp từ trang cá nhân.
                </p>
              </div>

              {/* Tên hiển thị (Có thể chỉnh sửa tự do) */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
                  Tên hiển thị
                </label>
                <div className="relative">
                  <UserIcon
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nhập tên hiển thị của bạn"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* THANH HÀNH ĐỘNG (NÚT LƯU) */}
            <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 dark:shadow-indigo-900/40 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                <span>
                  {isSaving ? "Đang lưu thay đổi..." : "Lưu thay đổi"}
                </span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
