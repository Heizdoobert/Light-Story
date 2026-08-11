import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const ChapterReaderPageContent = dynamic(() =>
  import("@/components/reader/ChapterReaderPageContent").then(
    (mod) => mod.ChapterReaderPageContent
  )
);

export default function ChapterReaderPage() {
  return (
    <Suspense fallback={null}>
      <ChapterReaderPageContent />
    </Suspense>
  );
}
