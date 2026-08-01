"use client";

import { Suspense } from "react";
import { SearchPageContent } from "@/components/comics/SearchPageContent";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
