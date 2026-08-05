"use client";

import React, { useState } from "react";
import { MessageSquare, Heart, Send, Flame, Sparkles, ThumbsUp, Smile } from "lucide-react";

interface Comment {
  id: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
}

interface ChapterCommentsSectionProps {
  chapterId: string;
  comicId: string;
  onLoginClick?: () => void;
}

export const ChapterCommentsSection: React.FC<ChapterCommentsSectionProps> = ({
  onLoginClick,
}) => {
  const [reactions, setReactions] = useState({
    heart: 124,
    fire: 89,
    mindblown: 45,
    laugh: 32,
  });
  const [userReaction, setUserReaction] = useState<string | null>(null);

  const [comments, setComments] = useState<Comment[]>([
    {
      id: "c1",
      userName: "Phan Hoài Nam",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nam",
      content: "Chương này thực sự bùng nổ! Nét vẽ càng ngày càng đẹp xuất sắc luôn ❤️",
      createdAt: "10 phút trước",
      likes: 18,
      isLiked: false,
    },
    {
      id: "c2",
      userName: "Minh Anh",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=MinhAnh",
      content: "Hóng chương tiếp theo quá ad ơi, cliffhanger đỉnh cao thực sự 🔥🔥",
      createdAt: "45 phút trước",
      likes: 9,
      isLiked: true,
    },
    {
      id: "c3",
      userName: "Trần Bảo Long",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Long",
      content: "Có ai nhận ra chi tiết ẩn ở trang 5 không? Đỉnh vãi!! 🤯",
      createdAt: "2 giờ trước",
      likes: 24,
      isLiked: false,
    },
  ]);

  const [newComment, setNewComment] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "top">("newest");

  const handleReaction = (type: keyof typeof reactions) => {
    if (userReaction === type) {
      setUserReaction(null);
      setReactions((prev) => ({ ...prev, [type]: prev[type] - 1 }));
    } else {
      if (userReaction) {
        setReactions((prev) => ({
          ...prev,
          [userReaction as keyof typeof reactions]:
            prev[userReaction as keyof typeof reactions] - 1,
        }));
      }
      setUserReaction(type);
      setReactions((prev) => ({ ...prev, [type]: prev[type] + 1 }));
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const added: Comment = {
      id: `c-${Date.now()}`,
      userName: "Bạn (Bạn đọc)",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser",
      content: newComment.trim(),
      createdAt: "Vừa xong",
      likes: 0,
      isLiked: false,
    };

    setComments([added, ...comments]);
    setNewComment("");
  };

  const handleToggleLike = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const nextLiked = !c.isLiked;
          return {
            ...c,
            isLiked: nextLiked,
            likes: nextLiked ? c.likes + 1 : c.likes - 1,
          };
        }
        return c;
      })
    );
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === "top") return b.likes - a.likes;
    return 0; // default insertion order is newest
  });

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-10 my-8 border-t border-slate-200 dark:border-slate-800 transition-colors">
      {/* Reaction Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="text-amber-500" size={20} />
          Cảm xúc về chương này
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => handleReaction("heart")}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all font-semibold text-sm ${
              userReaction === "heart"
                ? "border-rose-500 bg-rose-500/10 text-rose-500 shadow-sm"
                : "border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            <Heart size={18} className={userReaction === "heart" ? "fill-rose-500" : ""} />
            <span>Yêu thích</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold">
              {reactions.heart}
            </span>
          </button>

          <button
            onClick={() => handleReaction("fire")}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all font-semibold text-sm ${
              userReaction === "fire"
                ? "border-amber-500 bg-amber-500/10 text-amber-500 shadow-sm"
                : "border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            <Flame size={18} className={userReaction === "fire" ? "fill-amber-500" : ""} />
            <span>Bùng nổ</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold">
              {reactions.fire}
            </span>
          </button>

          <button
            onClick={() => handleReaction("mindblown")}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all font-semibold text-sm ${
              userReaction === "mindblown"
                ? "border-purple-500 bg-purple-500/10 text-purple-500 shadow-sm"
                : "border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            <Smile size={18} />
            <span>Đỉnh cao</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold">
              {reactions.mindblown}
            </span>
          </button>

          <button
            onClick={() => handleReaction("laugh")}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all font-semibold text-sm ${
              userReaction === "laugh"
                ? "border-blue-500 bg-blue-500/10 text-blue-500 shadow-sm"
                : "border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            <ThumbsUp size={18} />
            <span>Hài hước</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold">
              {reactions.laugh}
            </span>
          </button>
        </div>
      </div>

      {/* Comment Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="text-primary" size={22} />
          Bình luận ({comments.length})
        </h3>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setSortBy("newest")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sortBy === "newest"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Mới nhất
          </button>
          <button
            onClick={() => setSortBy("top")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sortBy === "top"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Nổi bật nhất
          </button>
        </div>
      </div>

      {/* New Comment Input */}
      <form onSubmit={handleAddComment} className="mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm focus-within:border-primary transition-all">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Viết bình luận của bạn về chương này..."
            rows={3}
            className="w-full bg-transparent border-0 focus:ring-0 outline-none resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm sm:text-base"
          />

          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
            <button
              type="button"
              onClick={onLoginClick}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-primary transition-colors font-medium text-left"
            >
              Tôn trọng cộng đồng &amp; không spoil nội dung. (Đăng nhập)
            </button>

            <button
              type="submit"
              disabled={!newComment.trim()}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md shadow-primary/20 transition-all"
            >
              <Send size={15} />
              Gửi bình luận
            </button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {sortedComments.map((comment) => (
          <div
            key={comment.id}
            className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700"
          >
            <div className="flex items-start gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={comment.userAvatar}
                alt={comment.userName}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex-shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {comment.userName}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {comment.createdAt}
                  </span>
                </div>

                <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed mb-3">
                  {comment.content}
                </p>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggleLike(comment.id)}
                    className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
                      comment.isLiked
                        ? "text-rose-500"
                        : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    <Heart size={14} className={comment.isLiked ? "fill-rose-500" : ""} />
                    <span>{comment.likes}</span>
                  </button>

                  <button className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all">
                    Trả lời
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
