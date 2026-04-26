import { ReaderPage } from '../../../../../views/ReaderPage';

interface StoryChapterPageProps {
  params: Promise<{
    storyId: string;
    chapterId: string;
  }>;
}

export default async function StoryChapterPage({ params }: StoryChapterPageProps) {
  const { storyId, chapterId } = await params;
  return <ReaderPage storyId={storyId} chapterId={chapterId} />;
}
