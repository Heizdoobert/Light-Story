"use client";

import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
}

export function DataTable<T extends Record<string, any>>({ columns, data }: DataTableProps<T>) {
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-slate-500 text-sm">Không có dữ liệu.</div>;
  }

  return (
    <div className="w-full overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
      <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-bold text-slate-500">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-6 py-4">{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {data.map((item, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4">
                  {col.render ? col.render(item) : item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
