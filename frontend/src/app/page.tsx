import { fetchComicCatalog } from "@/services/comicCms.service";
import { HomePage } from "./_components/HomePage"; // Hoặc đường dẫn trỏ tới component HomePage của bạn

export default async function Page() {
  // 1. Gọi API lấy toàn bộ danh sách truyện từ Cms service
  // Dùng catch để nếu lỗi thì trả về mảng rỗng, không làm sập cả trang web
  const allComics = await fetchComicCatalog().catch(() => []);

  // 2. Cắt lấy đúng 15 truyện đầu tiên (Mới nhất) và đồng bộ kiểu dữ liệu cho TypeScript
  const top15Comics = allComics.slice(0, 15).map((comic: any) => ({
    ...comic,
    // Bổ sung các trường còn thiếu để khớp hoàn toàn với kiểu ComicContext
    tenantKey: comic.tenantKey || "",
    storyId: comic.storyId || comic.id || "",
    slug: comic.slug || comic.id || "",
  }));

  // 3. Truyền 15 truyện này xuống Client Component (HomePage) để hiển thị
  return <HomePage initialComics={top15Comics} />;
}
