import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProfileCountQuery, useChapterCountQuery } from '@/app/_presenters/useOperationsPresenter';
import { useAdConfigsQuery } from '@/app/_presenters/useAdManagerPresenter';
import { SupabaseStoryRepository } from '@/services/repositories/SupabaseStoryRepository';
import { Story } from '@/types/entities';
import { ArrowRight, BookOpen, CircleAlert, Coins, FileText, Library, MessageSquare, Shield, Users, Workflow } from 'lucide-react';

const storyRepo = new SupabaseStoryRepository();

type OperationsCenterTabProps = {
  onNavigate: (tab: string) => void;
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  description: string;
}> = ({ label, value, description }) => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{description}</p>
  </div>
);

const SectionCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, icon, children }) => (
  <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-sm">
    <header className="flex items-start gap-3">
      <div className="rounded-2xl bg-slate-900 text-white dark:bg-primary p-3">{icon}</div>
      <div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
      </div>
    </header>
    {children}
  </section>
);

const ActionButton: React.FC<{
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}> = ({ label, onClick, variant = 'secondary' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-colors ${
      variant === 'primary'
        ? 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300'
        : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    {label}
    <ArrowRight size={16} />
  </button>
);

export const OperationsCenterTab: React.FC<OperationsCenterTabProps> = ({ onNavigate }) => {
  const storiesQuery = useQuery({
    queryKey: ['operations-center-stories'],
    queryFn: () => storyRepo.getStories(),
  });

  const profileCountQuery = useProfileCountQuery();
  const chapterCountQuery = useChapterCountQuery();

  const adSettingsQuery = useAdConfigsQuery();

  const roleDistributionQuery = useQuery({
    queryKey: ['operations-center-role-distribution'],
    queryFn: async () => {
      const res = await fetch('/api/role-distribution');
      if (!res.ok) throw new Error('Failed to load role distribution');
      const json = await res.json();
      return json.data as Array<{ role: string; total: number }>;
    },
  });

  const stories = storiesQuery.data ?? [];
  const activeStories = stories.filter((story) => story.status === 'ongoing');
  const completedStories = stories.filter((story) => story.status === 'completed');
  const totalViews = useMemo(() => stories.reduce((sum, story) => sum + (story.views || 0), 0), [stories]);
  const totalLikes = useMemo(() => stories.length * 2, [stories.length]);

  const topStories = useMemo(
    () => [...stories].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5),
    [stories],
  );

  const totalAuthors = useMemo(() => {
    const pool = new Set<string>();
    for (const story of stories) {
      const authorName = (story.author ?? '').trim();
      if (authorName) pool.add(authorName.toLowerCase());
    }
    return pool.size;
  }, [stories]);

  const totalCategories = useMemo(() => {
    const pool = new Set<string>();
    for (const story of stories) {
      const categoryName = (story.category ?? '').trim();
      if (categoryName) pool.add(categoryName.toLowerCase());
    }
    return pool.size;
  }, [stories]);
  const totalProfiles = profileCountQuery.data ?? 0;
  const totalChapters = chapterCountQuery.data ?? 0;
  const totalAdSlots = adSettingsQuery.data ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Operations Center</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            Centralize content, people, commerce, analytics, and system operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ActionButton label="Open Stories" onClick={() => onNavigate('stories')} variant="primary" />
          <ActionButton label="Open Users" onClick={() => onNavigate('users')} />
          <ActionButton label="Open Settings" onClick={() => onNavigate('settings')} />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Stories" value={String(stories.length)} description="Managed items in the content catalogue" />
        <MetricCard label="Users" value={String(totalProfiles)} description="Profiles currently stored in the system" />
        <MetricCard label="Views" value={totalViews.toLocaleString()} description="Aggregated readership across stories" />
        <MetricCard label="Chapters" value={String(totalChapters)} description="Published chapter records available" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionCard
          title="Core Content Management"
          description="Review stories, keep taxonomy tidy, and prepare future crawler intake and library workflows."
          icon={<BookOpen size={18} />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MetricCard label="Active stories" value={String(activeStories.length)} description="Currently ongoing titles" />
            <MetricCard label="Completed stories" value={String(completedStories.length)} description="Finished titles ready for archive" />
            <MetricCard label="Authors" value={String(totalAuthors)} description="Author records in taxonomy" />
            <MetricCard label="Categories" value={String(totalCategories)} description="Category records in taxonomy" />
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionButton label="Moderate Stories" onClick={() => onNavigate('stories')} variant="primary" />
            <ActionButton label="Manage Categories" onClick={() => onNavigate('categories')} />
            <ActionButton label="Manage Authors" onClick={() => onNavigate('authors')} />
          </div>
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400">
            Crawler intake and library/collection handling are reserved for the next schema pass. This tab keeps the entry point ready.
          </div>
        </SectionCard>

        <SectionCard
          title="User Management"
          description="Manage members, author accounts, and permissions from one operations surface."
          icon={<Users size={18} />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roleDistributionQuery.data?.map((item) => (
              <div key={item.role} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Role</p>
                <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{item.role}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.total} accounts</p>
              </div>
            ))}
            {!roleDistributionQuery.data?.length && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-500 dark:text-slate-400">
                Role distribution is loading or no profiles exist yet.
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionButton label="Manage Members" onClick={() => onNavigate('users')} variant="primary" />
            <ActionButton label="Review Authors" onClick={() => onNavigate('authors')} />
          </div>
        </SectionCard>

        <SectionCard
          title="Commerce & Interaction"
          description="Prepare transactions, VIP plans, promotions, ads, comments, and rating workflows."
          icon={<Coins size={18} />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MetricCard label="Ad slots" value={String(totalAdSlots)} description="Monetization configs already in site settings" />
            <MetricCard label="VIP plans" value="0" description="Schema pending for subscription tiers" />
            <MetricCard label="Promotions" value="0" description="Event/campaign structures pending" />
            <MetricCard label="Comment queues" value="0" description="Moderation schema pending" />
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionButton label="Open Ads" onClick={() => onNavigate('ads')} variant="primary" />
            <ActionButton label="Prepare VIP" onClick={() => onNavigate('operations')} />
          </div>
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400">
            Transaction, VIP, promo, event, and rating workflows are surfaced here as an operations hub until dedicated schema is added.
          </div>
        </SectionCard>

        <SectionCard
          title="Analytics & Reporting"
          description="Keep operations visible with usage and revenue-oriented summaries."
          icon={<FileText size={18} />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MetricCard label="Total reads" value={totalViews.toLocaleString()} description="Current readership volume" />
            <MetricCard label="Estimated engagement" value={String(totalLikes)} description="Lightweight engagement proxy" />
            <MetricCard label="Completed titles" value={String(completedStories.length)} description="Stories ready for reporting" />
            <MetricCard label="Revenue reports" value="Pending" description="Backend revenue source not yet wired" />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-950/60">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Story</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {topStories.map((story: Story) => (
                  <tr key={story.id}>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-200">{story.title}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{story.status}</td>
                    <td className="px-4 py-3 font-black text-slate-700 dark:text-slate-200">{story.views.toLocaleString()}</td>
                  </tr>
                ))}
                {topStories.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-slate-500 dark:text-slate-400" colSpan={3}>
                      No story data available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="System & Moderation Backlog"
        description="Manage moderation, menu visibility, backups, and support automation from one place."
        icon={<Shield size={18} />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black">
              <Workflow size={16} /> Content moderation
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use story and chapter controls to approve, archive, or review content.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black">
              <Library size={16} /> Menu visibility
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Configured through System Settings for each role.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black">
              <CircleAlert size={16} /> Backup / Restore
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">System settings snapshot export and restore are available in settings.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black">
              <MessageSquare size={16} /> Comments & ratings
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Interaction moderation will plug in when the backend schema lands.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

