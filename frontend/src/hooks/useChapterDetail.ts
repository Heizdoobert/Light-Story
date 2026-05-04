import { useQuery } from "@tanstack/react-query";

export const useChapterDetail = (chapterId: string) => {
  return useQuery({
    queryKey: ["chapter", chapterId],
    queryFn: async () => {
      if (!chapterId) return null;

      const response = await fetch(`/api/chapters?id=${chapterId}`);
      const json = await response.json();

      if (json.error) throw new Error(json.error);

      return json.data;
    },
    enabled: !!chapterId,
    staleTime: 1000 * 60 * 60,
  });
};
