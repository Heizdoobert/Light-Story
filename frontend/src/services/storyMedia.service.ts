import { supabase } from '@/lib/supabase/client';

export async function uploadStoryCoverImage(file: File): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }

  const fileExtension = file.name.split('.').pop() || 'png';
  const filePath = `story-covers/${crypto.randomUUID()}.${fileExtension}`;

  const { error: uploadError } = await supabase.storage
    .from('story-covers')
    .upload(filePath, file, {
      contentType: file.type || 'image/png',
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('story-covers').getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error('Unable to resolve uploaded image URL');
  }

  return data.publicUrl;
}