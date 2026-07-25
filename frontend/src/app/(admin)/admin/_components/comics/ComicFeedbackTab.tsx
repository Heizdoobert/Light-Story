"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  AlertOctagon,
  Trash2,
  EyeOff,
  Search,
  User,
  Clock,
} from "lucide-react";
import type { ComicCmsRecord } from "@/services/comics/comicCms.service";

export type CommentItem = {
  id: string;
  comicId: string;
  comicTitle: string;
  chapterNumber?: number;
  userName: string;
  commentText: string;
  createdAt: string;
  isSpam?: boolean;
  isHidden?: boolean;
};

export type ReportTicket = {
  id: string;
  comicId: string;
  comicTitle: string;
  chapterNumber: number;
  reporterName: string;
  issueType: "broken_image" | "missing_page" | "typo" | "other";
  description: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
};

type ComicFeedbackTabProps = {
  catalog: ComicCmsRecord[];
  canManageAll: boolean;
};

export const ComicFeedbackTab: React.FC<ComicFeedbackTabProps> = ({
  catalog: _catalog,
  canManageAll,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"comments" | "reports">("reports");
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [reports, setReports] = useState<ReportTicket[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleToggleHideComment = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, isHidden: !c.isHidden } : c))
    );
  };

  const handleDeleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const handleUpdateReportStatus = (ticketId: string, nextStatus: "open" | "in_progress" | "resolved") => {
    setReports((prev) =>
      prev.map((r) => (r.id === ticketId ? { ...r, status: nextStatus } : r))
    );
  };

  const filteredComments = comments.filter(
    (c) =>
      c.comicTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.commentText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredReports = reports.filter(
    (r) =>
      r.comicTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reporterName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* TOP CONTROLS & SUB-TAB TABS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("reports")}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${
              activeSubTab === "reports"
                ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
            }`}
          >
            <AlertOctagon size={16} /> Báo lỗi từ độc giả ({reports.filter((r) => r.status !== "resolved").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("comments")}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${
              activeSubTab === "comments"
                ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
            }`}
          >
            <MessageSquare size={16} /> Quản lý bình luận ({comments.length})
          </button>
        </div>

        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs">
          <Search size={14} className="text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên truyện, nội dung..."
            className="bg-transparent focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
          />
        </label>
      </div>

      {/* TICKET REPORTS WORKSPACE */}
      {activeSubTab === "reports" && (
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Danh sách Ticket Báo lỗi
          </h3>

          {filteredReports.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-10 text-center text-xs font-semibold text-slate-400">
              Không có ticket báo lỗi nào.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredReports.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-sm space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          ticket.issueType === "broken_image"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : ticket.issueType === "missing_page"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                        }`}
                      >
                        {ticket.issueType === "broken_image"
                          ? "Ảnh hỏng"
                          : ticket.issueType === "missing_page"
                          ? "Thiếu trang"
                          : "Lỗi khác"}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {ticket.comicTitle} - Chapter {ticket.chapterNumber}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateReportStatus(ticket.id, "open")}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold ${
                          ticket.status === "open"
                            ? "bg-rose-500 text-white"
                            : "bg-slate-100 dark:bg-slate-900 text-slate-500"
                        }`}
                      >
                        Mới
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateReportStatus(ticket.id, "in_progress")}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold ${
                          ticket.status === "in_progress"
                            ? "bg-amber-500 text-white"
                            : "bg-slate-100 dark:bg-slate-900 text-slate-500"
                        }`}
                      >
                        Đang xử lý
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateReportStatus(ticket.id, "resolved")}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold ${
                          ticket.status === "resolved"
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-100 dark:bg-slate-900 text-slate-500"
                        }`}
                      >
                        Đã khắc phục
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                    {ticket.description}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 font-semibold pt-1">
                    <span className="flex items-center gap-1">
                      <User size={12} /> {ticket.reporterName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {new Date(ticket.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMMENTS MANAGEMENT WORKSPACE */}
      {activeSubTab === "comments" && (
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Quản lý bình luận độc giả
          </h3>

          {filteredComments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-10 text-center text-xs font-semibold text-slate-400">
              Không có bình luận nào.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredComments.map((cmt) => (
                <div
                  key={cmt.id}
                  className={`rounded-3xl border p-4 shadow-sm space-y-2 transition ${
                    cmt.isHidden
                      ? "border-slate-200 dark:border-slate-900 bg-slate-100/60 dark:bg-slate-900/30 opacity-60"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                      <User size={14} className="text-cyan-500" />
                      {cmt.userName}
                      <span className="text-slate-400 font-normal">trong</span>
                      <span className="text-cyan-600 dark:text-cyan-400">
                        {cmt.comicTitle} {cmt.chapterNumber ? `(Chương ${cmt.chapterNumber})` : ""}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleHideComment(cmt.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold transition"
                        title="Chuyển sang trạng thái Chờ duyệt (Pending) cho Admin xem xét"
                      >
                        <EyeOff size={14} className={cmt.isHidden ? "text-amber-500" : ""} />
                        {cmt.isHidden ? "Đã ẩn (Chờ duyệt)" : "Ẩn bình luận"}
                      </button>
                      {canManageAll && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(cmt.id)}
                          className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500"
                          title="Xóa bình luận rác (Chỉ Admin)"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {cmt.commentText}
                  </p>

                  <div className="text-[10px] text-slate-400 font-medium">
                    {new Date(cmt.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
