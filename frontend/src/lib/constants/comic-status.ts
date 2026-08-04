export const COMIC_STATUS_MAP: Record<string, string> = {
  ongoing: "Đang tiến hành",
  completed: "Đã hoàn thành",
  dropped: "Tạm ngưng",
  draft: "Bản nháp",
} as const;

export function getComicStatusLabel(status: string | null | undefined): string {
  if (!status) return "Đang cập nhật";
  return COMIC_STATUS_MAP[status.toLowerCase()] || status;
}
