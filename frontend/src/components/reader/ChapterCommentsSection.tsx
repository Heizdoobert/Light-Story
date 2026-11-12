"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Send, Heart, EyeOff, User } from "lucide-react";
import { SpoilerText } from "@/components/shared/SpoilerText";
import { formatRelativeTime } from "@/sdk";

export interface ChapterCommentsSectionProps {
  chapterId: string;
  comicId: string;
  onLoginClick?: () => void;
}

export interface ChapterCommentItem {
  id: string;
  chapterId: string;
  authorName: string;
  body: string;
  createdAt: string;
  likes: number;
  liked?: boolean;
}

const DEFAULT_COMMENTS: ChapterCommentItem[] = [
  {
    id: "welcome-comment-1",
    chapterId: "default",
    authorName: "Light-Story Mod",
    body: "Chào mừng bạn đến với khu vực thảo luận! Khi bàn luận về các tình tiết quan trọng, bạn vui lòng sử dụng cú pháp >!tiết lộ cốt truyện!< để tránh làm mất vui cho các độc giả khác nhé.",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    likes: 12,
  },
];

export const ChapterCommentsSection: React.FC<ChapterCommentsSectionProps> = ({
  chapterId,
  onLoginClick,
}) => {
  const [comments, setComments] = useState<ChapterCommentItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now] = useState(() => Date.now());

  // Load comments from localStorage on chapter change
  useEffect(() => {
    if (!chapterId) return;
    try {
      const storageKey = `comments:${chapterId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setComments(parsed);
          return;
        }
      }
      // Fallback initial comment for demonstration
      setComments(DEFAULT_COMMENTS);
    } catch {
      setComments(DEFAULT_COMMENTS);
    }
  }, [chapterId]);

  const saveComments = (newComments: ChapterCommentItem[]) => {
    setComments(newComments);
    try {
      localStorage.setItem(`comments:${chapterId}`, JSON.stringify(newComments));
    } catch {
      // Storage quota or private browsing
    }
  };

  const handleInsertSpoiler = () => {
    setInputText((prev) => `${prev}>!nội dung spoiler!<`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    const newComment: ChapterCommentItem = {
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      chapterId,
      authorName: authorName.trim() || "Độc giả ẩn danh",
      body: trimmed,
      createdAt: new Date().toISOString(),
      likes: 0,
      liked: false,
    };

    const updated = [newComment, ...comments];
    saveComments(updated);
    setInputText("");
    setIsSubmitting(false);
  };

  const handleToggleLike = (id: string) => {
    const updated = comments.map((c) => {
      if (c.id === id) {
        const liked = !c.liked;
        return {
          ...c,
          liked,
          likes: liked ? c.likes + 1 : Math.max(0, c.likes - 1),
        };
      }
      return c;
    });
    saveComments(updated);
  };

  return (
    <section
      aria-label="Khu vực bình luận"
      className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-8 my-8 border-t border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 dark:bg-orange-500/20">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Bình luận & Thảo luận
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {comments.length} bình luận trong chương này
              </p>
            </div>
          </div>

          {onLoginClick && (
            <button
              onClick={onLoginClick}
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline"
            >
              Đăng nhập để nhận thông báo
            </button>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-8 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Tên của bạn (hoặc để ẩn danh)..."
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={40}
              className="px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors max-w-xs"
            />

            <button
              type="button"
              onClick={handleInsertSpoiler}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors self-start"
              title="Chèn thẻ che nội dung tiết lộ cốt truyện"
            >
              <EyeOff size={14} className="text-amber-500" />
              <span>Chèn Spoiler</span>
            </button>
          </div>

          <div className="relative">
            <textarea
              rows={3}
              placeholder="Chia sẻ cảm nghĩ của bạn về chương truyện này... (dùng >!nội dung!< để che spoiler)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              maxLength={1000}
              className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-slate-400">
                {inputText.length} / 1000 ký tự
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !inputText.trim()}
                className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-sm hover:shadow disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Gửi bình luận</span>
                <Send size={14} />
              </button>
            </div>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800/60">
          {comments.map((comment) => (
            <div key={comment.id} className="pt-4 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {comment.authorName ? (
                      comment.authorName.charAt(0).toUpperCase()
                    ) : (
                      <User size={14} />
                    )}
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                      {comment.authorName}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {formatRelativeTime(comment.createdAt, { now, locale: "vi" })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleLike(comment.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    comment.liked
                      ? "text-rose-500 bg-rose-50 dark:bg-rose-950/40"
                      : "text-slate-400 hover:text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                  aria-label={comment.liked ? "Bỏ thích" : "Thích"}
                >
                  <Heart
                    size={13}
                    className={comment.liked ? "fill-current" : ""}
                  />
                  <span>{comment.likes}</span>
                </button>
              </div>

              <div className="mt-2.5 ml-10 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <SpoilerText content={comment.body} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
