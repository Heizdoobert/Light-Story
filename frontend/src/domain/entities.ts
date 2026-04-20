export interface Story {
  id: string;
  title: string;
  author: string;
  author_id?: string | null;
  description: string;
  cover_url: string;
  category: string;
  category_id?: string | null;
  status: 'ongoing' | 'completed';
  views: number;
  created_at: string;
}

export interface Author {
  id: string;
  name: string;
  bio?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
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
