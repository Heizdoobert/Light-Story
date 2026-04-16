export interface Story {
  id: string;
  title: string;
  author: string;
  description: string;
  cover_url: string;
  category: string;
  status: 'ongoing' | 'completed';
  views: number;
  created_at: string;
}

export interface Chapter {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  content: string;
  created_at: string;
}

export interface SiteSetting {
  id: number;
  key: string;
  value: string;
}
