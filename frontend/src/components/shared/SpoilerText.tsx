"use client";

import React, { useState } from "react";

export interface SpoilerTextProps {
  content: string;
  className?: string;
}

/**
 * Checks if a text string contains spoiler markup:
 * Supports `>!text!<` or `||text||`
 */
export function containsSpoiler(text: string): boolean {
  if (!text) return false;
  return /(>![\s\S]*?!<|\|\|[\s\S]*?\|\|)/.test(text);
}

export const SpoilerTag: React.FC<{ text: string }> = ({ text }) => {
  const [revealed, setRevealed] = useState(false);

  const toggle = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setRevealed((prev) => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle(e);
    }
  };

  return (
    <span
      role="button"
      tabIndex={0}
      aria-expanded={revealed}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      title={
        revealed
          ? "Bấm để ẩn nội dung tiết lộ"
          : "Cảnh báo tiết lộ nội dung! Bấm để xem"
      }
      className={`inline-block px-1.5 py-0.5 mx-0.5 rounded transition-all cursor-pointer font-medium text-xs sm:text-sm select-none ${
        revealed
          ? "bg-amber-500/10 dark:bg-amber-500/20 text-slate-900 dark:text-slate-100 border border-amber-500/30"
          : "bg-slate-800 text-transparent hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 border border-transparent"
      }`}
    >
      {text}
    </span>
  );
};

export const SpoilerText: React.FC<SpoilerTextProps> = ({
  content,
  className = "",
}) => {
  if (!content) return null;

  // Split content by `>!...!<` or `||...||`
  const parts = content.split(/(>![\s\S]*?!<|\|\|[\s\S]*?\|\|)/g);

  return (
    <span className={`leading-relaxed ${className}`}>
      {parts.map((part, idx) => {
        if (part.startsWith(">!") && part.endsWith("!<")) {
          const inner = part.slice(2, -2);
          return <SpoilerTag key={idx} text={inner} />;
        }
        if (part.startsWith("||") && part.endsWith("||")) {
          const inner = part.slice(2, -2);
          return <SpoilerTag key={idx} text={inner} />;
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
      })}
    </span>
  );
};
