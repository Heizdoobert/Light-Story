import { HomePage } from './_components/HomePage';
import { fetchStories } from '@/services/story.service';

export default async function Page() {
  const stories = await fetchStories().catch(() => []);

  return <HomePage initialStories={stories} />;
}
