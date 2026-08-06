import type { Metadata } from "next";
import { SearchPageContent } from '@/components/comics/SearchPageContent';

export const metadata: Metadata = {
  title: "Truyện tranh - Light Story",
  description:
    "Khám phá bộ sưu tập truyện tranh đa dạng tại Light Story — cập nhật nhanh, đọc mượt mà trên mọi thiết bị.",
};

export default function ComicsListPage() {
  return <SearchPageContent />;
}
