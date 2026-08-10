"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface FormEditorProps {
  title: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
}

export function FormEditor({ title, children, onSubmit, isSubmitting = false }: FormEditorProps) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">{title}</h2>
      <form onSubmit={onSubmit} className="space-y-6">
        {children}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default FormEditor;
