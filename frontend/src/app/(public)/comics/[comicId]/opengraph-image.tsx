/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { getServerSupabase } from "@/lib/supabase/server";
import { getR2ImageUrl } from "@/lib/utils/image-url";

export const runtime = "nodejs";
export const alt = "Light Story - Đọc Truyện Tranh Online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ comicId: string }> };

export default async function Image({ params }: Props) {
  const { comicId } = await params;
  const supabase = await getServerSupabase();

  let title = "Truyện Tranh Light Story";
  let author = "Đang cập nhật";
  let coverUrl: string | null = null;
  let views = 0;
  let category = "";

  if (supabase) {
    const { data: comic } = await supabase
      .from("stories")
      .select("title, author, cover_url, views, category")
      .eq("id", comicId)
      .maybeSingle();

    if (comic) {
      if (comic.title) title = comic.title;
      if (comic.author) author = comic.author;
      if (comic.cover_url) coverUrl = getR2ImageUrl(comic.cover_url);
      if (typeof comic.views === "number") views = comic.views;
      if (comic.category) category = comic.category;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#090d16",
          color: "#ffffff",
          padding: "48px",
          fontFamily: "sans-serif",
          alignItems: "center",
          gap: "44px",
        }}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            style={{
              width: "320px",
              height: "480px",
              objectFit: "cover",
              borderRadius: "20px",
              border: "2px solid rgba(255,255,255,0.1)",
            }}
          />
        ) : (
          <div
            style={{
              width: "320px",
              height: "480px",
              backgroundColor: "#1e293b",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontSize: "24px",
              fontWeight: 700,
            }}
          >
            Light Story
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                color: "#f97316",
                fontSize: "22px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              Light Story • Truyện Tranh Online
            </div>
            {category && (
              <div
                style={{
                  backgroundColor: "rgba(249, 115, 22, 0.15)",
                  color: "#fb923c",
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                {category}
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: "48px",
              fontWeight: 900,
              marginTop: "16px",
              lineHeight: 1.2,
              maxHeight: "130px",
              overflow: "hidden",
              color: "#ffffff",
            }}
          >
            {title}
          </div>

          <div style={{ fontSize: "24px", color: "#94a3b8", marginTop: "16px" }}>
            Tác giả: <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{author}</span>
          </div>

          <div style={{ display: "flex", gap: "16px", marginTop: "36px" }}>
            <div
              style={{
                backgroundColor: "#1e293b",
                padding: "10px 22px",
                borderRadius: "999px",
                fontSize: "18px",
                color: "#38bdf8",
                display: "flex",
                alignItems: "center",
                fontWeight: 600,
              }}
            >
              👁️ {views.toLocaleString()} lượt xem
            </div>
            <div
              style={{
                backgroundColor: "#ea580c",
                padding: "10px 24px",
                borderRadius: "999px",
                fontSize: "18px",
                fontWeight: 700,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
              }}
            >
              Đọc Ngay Miễn Phí
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
