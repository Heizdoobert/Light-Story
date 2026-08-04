"use client";

import { Star } from 'lucide-react';

export interface RatingStarsProps {
  rating: number; // 0 to 5
}

export function RatingStars({ rating }: RatingStarsProps) {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          className={
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'
          }
        />
      ))}
      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

export default RatingStars;
