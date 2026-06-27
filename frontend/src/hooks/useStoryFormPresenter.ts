'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { saveStory } from '@/services/story.service';
import { fetchAuthors, fetchCategories } from '@/services/taxonomy.service';
import { uploadStoryCoverImage } from '@/services/storyMedia.service';
import { Story } from '@/types/entities';
import { rejectDbChangeToast, resolveDbChangeToast, startDbChangeToast } from '@/lib/dbChangeToast';

type StoryCreatePayload = {
  story: Partial<Story>;
  coverFile: File;
};

export function useStoryFormPresenter() {
  const queryClient = useQueryClient();

  const authorsQuery = useQuery({
    queryKey: ['authors'],
    queryFn: () => fetchAuthors(),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  });

  const createStoryMutation = useMutation({
    mutationFn: async ({ story, coverFile }: StoryCreatePayload) => {
      const coverUrl = await uploadStoryCoverImage(coverFile);
      return saveStory({ ...story, cover_url: coverUrl });
    },
    onMutate: (payload) => {
      const title = payload.story.title?.trim() || 'new story';
      const toastId = startDbChangeToast(`Creating "${title}"...`);
      return { toastId };
    },
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['admin_stories'] });
      resolveDbChangeToast(context?.toastId, 'Story created successfully');
    },
    onError: (error, _variables, context) => {
      rejectDbChangeToast(context?.toastId, error, 'save_story');
    },
  });

  return {
    authorsQuery,
    categoriesQuery,
    createStoryMutation,
  };
}