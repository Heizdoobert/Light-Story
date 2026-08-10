'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchStories } from '@/services/comics/story.service';
import { createChapter } from '@/actions/chapter-form.actions';
import type { CreateChapterFormInput } from '@/lib/schemas/chapter-form';
import { Chapter } from '@/types/entities';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '@/lib/utils/db-change-toast';

export function useChapterFormPresenter() {
  const queryClient = useQueryClient();

  const storiesQuery = useQuery({
    queryKey: ['stories'],
    queryFn: () => fetchStories(),
    staleTime: 30_000,
  });

  const saveChapterMutation = useMutation({
    mutationFn: (newChapter: Partial<Chapter>) => createChapter(newChapter as CreateChapterFormInput),
    onMutate: (newChapter) => {
      const title = newChapter.title?.trim() || 'new chapter';
      const toastId = startDbChangeToast(`Creating \"${title}\"...`);
      return { toastId };
    },
    onSuccess: (_data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      queryClient.invalidateQueries({ queryKey: ['story', variables.story_id] });
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