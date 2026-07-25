const STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-500 text-white dark:bg-emerald-600",
  published: "bg-blue-500 text-white dark:bg-blue-600",
  ongoing: "bg-amber-500 text-white dark:bg-amber-600",
  draft: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
};

export const getStatusStyles = (status: string): string =>
  STATUS_STYLES[status] ?? "bg-indigo-500 text-white dark:bg-indigo-600";
