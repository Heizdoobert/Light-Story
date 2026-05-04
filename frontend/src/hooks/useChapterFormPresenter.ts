'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SupabaseChapterRepository } from '@/infrastructure/repositories/SupabaseChapterRepository';
import { SupabaseStoryRepository } from '@/infrastructure/repositories/SupabaseStoryRepository';
import { Chapter } from '@/types/entities';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '@/lib/dbChangeToast';

export function useChapterFormPresenter() {
  const queryClient = useQueryClient();
  const storyRepo = new SupabaseStoryRepository();
  const chapterRepo = new SupabaseChapterRepository();

  const storiesQuery = useQuery({
    queryKey: ['stories'],
    queryFn: () => storyRepo.getStories(),
    staleTime: 30_000,
  });

  const saveChapterMutation = useMutation({
    mutationFn: (newChapter: Partial<Chapter>) => chapterRepo.saveChapter(newChapter),
    onMutate: (newChapter) => {
      const title = newChapter.title?.trim() || 'new chapter';
      const toastId = startDbChangeToast(`Creating \"${title}\"...`);
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      resolveDbChangeToast(context?.toastId, 'Chapter created successfully');
    },
    onError: (error, _variables, context) => {
      rejectDbChangeToast(context?.toastId, error, 'save_chapter');
    },
  });

  return {
    storiesQuery,
    saveChapterMutation,
  };
}