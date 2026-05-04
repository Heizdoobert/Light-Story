import { HomePage } from './_components/HomePage';
import { fetchStories } from '@/services/story.service';

export default async function Page() {
  const result = await fetchStories().catch(() => []);
  const stories = Array.isArray(result) ? result : result.items;

  return <HomePage initialStories={stories} />;
}
