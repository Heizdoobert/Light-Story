import { ReaderPageContainer } from './_presenters/ReaderPageContainer';

interface StoryChapterPageProps {
  params: Promise<{
    storyId: string;
    chapterId: string;
  }>;
}

export default async function StoryChapterPage({ params }: StoryChapterPageProps) {
  const { storyId, chapterId } = await params;
  return <ReaderPageContainer storyId={storyId} chapterId={chapterId} />;
}
