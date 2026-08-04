export function formatDate(
  dateString?: string | Date | null,
  locale = "vi-VN",
): string {
  if (!dateString) return "Chưa cập nhật";
  try {
    const d =
      typeof dateString === "string" ? new Date(dateString) : dateString;
    if (isNaN(d.getTime())) return "Chưa cập nhật";
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return "Chưa cập nhật";
  }
}

export function formatRelativeTime(dateString?: string | Date | null): string {
  if (!dateString) return "Vừa xong";
  try {
    const d =
      typeof dateString === "string" ? new Date(dateString) : dateString;
    if (isNaN(d.getTime())) return "Vừa xong";
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return "Vừa xong";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
    if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)} ngày trước`;
    return formatDate(d);
  } catch {
    return "Vừa xong";
  }
}

export const formatTimeAgo = formatRelativeTime;
