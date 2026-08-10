"use client";

import { PenSquare } from "lucide-react";
import { AuthorManagementTab } from "@/components/admin/content/AuthorManagementTab";

export default function AdminAuthorsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <PenSquare className="text-orange-500" size={24} />
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
          Tác Giả & Nhóm Dịch
        </h1>
      </div>
      <AuthorManagementTab />
    </div>
  );
}
