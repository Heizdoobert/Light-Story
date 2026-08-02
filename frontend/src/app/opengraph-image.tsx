import { ImageResponse } from 'next/og';

// ponytail: edge runtime for fast zero-latency og image generation
export const runtime = 'edge';
export const alt = 'Light Story - Read Manga & Light Novels';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 'bold', color: '#38bdf8' }}>
          Light Story
        </div>
        <div style={{ fontSize: 28, color: '#94a3b8', marginTop: 16 }}>
          Read Manga, Manhua & Light Novels Online
        </div>
      </div>
    ),
    { ...size }
  );
}
