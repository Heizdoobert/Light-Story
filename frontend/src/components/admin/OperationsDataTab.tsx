import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../core/supabase';
import { Database, Loader2, TriangleAlert } from 'lucide-react';

type DataGroup = {
  key: string;
  title: string;
  description: string;
  tables: Array<{ table: string; label: string }>;
};

const DATA_GROUPS: DataGroup[] = [
  {
    key: 'content-ops',
    title: 'Content & Moderation',
    description: 'Collections, queue moderation, and interaction surfaces.',
    tables: [
      { table: 'collections', label: 'Collections' },
      { table: 'collection_stories', label: 'Collection stories' },
      { table: 'moderation_queue', label: 'Moderation queue' },
      { table: 'comments', label: 'Comments' },
      { table: 'ratings', label: 'Ratings' },
    ],
  },
  {
    key: 'crawler-ops',
    title: 'Crawler Intake',
    description: 'Crawler sources and run history.',
    tables: [
      { table: 'crawler_sources', label: 'Crawler sources' },
      { table: 'crawler_runs', label: 'Crawler runs' },
    ],
  },
  {
    key: 'commerce-ops',
    title: 'Commerce & VIP',
    description: 'Plans, subscriptions, promotions, events, and transactions.',
    tables: [
      { table: 'vip_plans', label: 'VIP plans' },
      { table: 'vip_subscriptions', label: 'VIP subscriptions' },
      { table: 'promotions', label: 'Promotions' },
      { table: 'events', label: 'Events' },
      { table: 'transactions', label: 'Transactions' },
    ],
  },
  {
    key: 'reporting-ops',
    title: 'Reporting',
    description: 'Revenue snapshot history for operations dashboards.',
    tables: [{ table: 'revenue_snapshots', label: 'Revenue snapshots' }],
  },
];

type TableStatus = {
  count: number | null;
  error: string | null;
};

type TablesOverview = Record<string, TableStatus>;

const TableCard: React.FC<{
  label: string;
  status: TableStatus;
}> = ({ label, status }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950/40">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    {status.error ? (
      <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">{status.error}</p>
    ) : (
      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{status.count ?? '-'}</p>
    )}
  </div>
);

export const OperationsDataTab: React.FC = () => {
  const overviewQuery = useQuery<TablesOverview>({
    queryKey: ['operations-data-overview'],
    queryFn: async () => {
      const client = supabase;
      if (!client) {
        return {};
      }

      const tableNames = DATA_GROUPS.flatMap((group) => group.tables.map((item) => item.table));
      const results = await Promise.all(
        tableNames.map(async (tableName) => {
          const { count, error } = await client.from(tableName).select('created_at', { count: 'exact' });
          return [
            tableName,
            {
              count: error ? null : (count ?? 0),
              error: error ? error.message : null,
            } satisfies TableStatus,
          ] as const;
        }),
      );

      return Object.fromEntries(results);
    },
  });

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-900 text-white dark:bg-primary p-3">
            <Database size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Operations Data</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Live scaffold for new admin backend tables. Use this tab to verify schema visibility and current row counts.
            </p>
          </div>
        </div>
      </header>

      {overviewQuery.isLoading && (
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <Loader2 size={16} className="animate-spin" /> Loading operations data...
        </div>
      )}

      {overviewQuery.isError && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 flex items-center gap-3">
          <TriangleAlert size={18} className="text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Unable to load operations data overview.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {DATA_GROUPS.map((group) => (
          <section
            key={group.key}
            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm"
          >
            <header>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{group.title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{group.description}</p>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.tables.map((item) => (
                <TableCard
                  key={item.table}
                  label={item.label}
                  status={overviewQuery.data?.[item.table] ?? { count: null, error: null }}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
