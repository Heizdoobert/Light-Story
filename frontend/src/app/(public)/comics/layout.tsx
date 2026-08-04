import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Danh Sách Truyện - Đọc Truyện Tranh Online | Light Story',
  description:
    'Danh sách truyện tranh Manga, Manhua, Manhwa mới nhất và phổ biến nhất tại Light Story.',
};

export default function ComicsListLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}