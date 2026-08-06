import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

type ChapterDetail = {
  id: string;
  title?: string;
  chapter_number?: number;
  image_urls?: string[];
  images?: string[];
  [key: string]: unknown;
};

export const useChapterDetail = (chapterId: string) => {
  return useQuery({
    queryKey: ["chapter", chapterId],
    queryFn: async () => {
      if (!chapterId) return null;
      if (!supabase) return null;
      const { data } = await supabase
        .from("chapters")
        .select("*")
        .eq("id", chapterId)
        .maybeSingle();
      return (data ?? null) as ChapterDetail | null;
    },
    enabled: !!chapterId,
    staleTime: 1000 * 60 * 60,
  });
};