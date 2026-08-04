"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/hooks/use-user";
import { updateUserProfile } from "@/lib/actions/user.actions";

export default function UserProfilePage() {
  const { user } = useUser();
  const [fullName, setFullName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setMessage("");
    const res = await updateUserProfile(user.id, { full_name: fullName });
    if (res.success) {
      setMessage("Cập nhật thông tin thành công!");
    } else {
      setMessage(`Lỗi: ${res.error}`);
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
          Thông Tin Tài Khoản
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Cập nhật hồ sơ cá nhân và cài đặt bảo mật.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Email
            </label>
            <Input
              type="email"
              value={user?.email || ""}
              disabled
              className="bg-slate-100 dark:bg-slate-800"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Họ và Tên
            </label>
            <Input
              type="text"
              placeholder="Nhập họ và tên..."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          {message && (
            <p
              className={`text-xs font-semibold ${message.startsWith("Lỗi") ? "text-rose-500" : "text-emerald-500"}`}
            >
              {message}
            </p>
          )}

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Đang lưu..." : "Lưu Thay Đổi"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
