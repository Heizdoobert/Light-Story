"use client";

import { ComicCard, ComicCardProps } from './comic-card';

export interface ComicListProps {
  comics: ComicCardProps[];
}

export function ComicList({ comics }: ComicListProps) {
  if (!comics || comics.length === 0) {
    return <p className="text-center text-slate-500 py-12">Không tìm thấy truyện nào.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {comics.map((comic) => (
        <ComicCard key={comic.id} {...comic} />
      ))}
    </div>
  );
}

export default ComicList;
