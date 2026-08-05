import { useEffect } from 'react';
import { supabase } from '@/infrastructure/supabase/client';

export default function useChapterSubscription(storyId: string, onUpdate: (chapter: any) => void) {
  useEffect(() => {
    if (!storyId || !supabase) return;
    const client = supabase;
    const channel = client.channel('public:chapters')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chapters', filter: `story_id=eq.${storyId}` }, (payload) => {
        onUpdate(payload.new || payload.old);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [storyId, onUpdate]);
}
