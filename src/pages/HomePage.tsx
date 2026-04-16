import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SupabaseStoryRepository } from '../infrastructure/repositories/SupabaseStoryRepository';
import { Story } from '../domain/entities';

export const HomePage: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const repo = new SupabaseStoryRepository();
        const data = await repo.getStories();
        setStories(data);
      } catch (error) {
        console.error('Error fetching stories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Đang tải danh sách truyện...</div>;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-primary tracking-tight mb-4">LightStory.v0</h1>
        <p className="text-text-muted">Khám phá thế giới truyện chữ tối giản</p>
      </header>

      {stories.length === 0 ? (
        <div className="text-center p-20 glass-card">
          <p className="text-text-muted mb-4">Chưa có truyện nào trong hệ thống.</p>
          <Link to="/admin" className="btn-primary">Đi tới trang Quản trị</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stories.map((story) => (
            <div key={story.id} className="glass-card flex flex-col">
              {story.cover_url && (
                <img 
                  src={story.cover_url} 
                  alt={story.title} 
                  className="w-full h-48 object-cover rounded-xl mb-4"
                  referrerPolicy="no-referrer"
                />
              )}
              <h2 className="text-xl font-bold mb-2">{story.title}</h2>
              <p className="text-text-muted text-sm mb-4 line-clamp-3 flex-1">{story.description}</p>
              <div className="flex justify-between items-center mt-auto">
                <span className="text-xs font-bold uppercase text-primary bg-primary/10 px-2 py-1 rounded">
                  {story.status}
                </span>
                <Link 
                  to={`/admin`} // Tạm thời link tới admin vì chưa có trang chi tiết truyện
                  className="text-sm font-bold text-text-main hover:text-primary transition-colors"
                >
                  Xem chi tiết →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-12 text-center">
        <Link to="/admin" className="text-sm text-text-muted hover:underline">Trang quản trị (Dành cho Admin)</Link>
      </div>
    </div>
  );
};
