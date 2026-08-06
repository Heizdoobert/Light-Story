import type { Metadata } from 'next';
import { HomePage } from '@/components/comics/HomePage';

export const metadata: Metadata = {
  title: 'Light-Story | Đọc Truyện Tranh Online Miễn Phí',
  description: 'Website đọc truyện tranh online miễn phí với hàng ngàn đầu truyện mới nhất, chất lượng cao, cập nhật liên tục.',
};

export default async function Page() {
  return <HomePage />;
}
