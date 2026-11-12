import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Light Story - Đọc Truyện Tranh Trực Tuyến",
    short_name: "Light Story",
    description:
      "Nền tảng đọc truyện tranh, Manga, Manhua, Webtoon chất lượng cao, tốc độ mượt mà trên Cloudflare Edge.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#f97316",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
