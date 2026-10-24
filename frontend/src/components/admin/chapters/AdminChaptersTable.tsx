'use client';

import {
  AdminTable,
  FilterBar,
  Tag,
  Button,
  Space,
  Select,
  EditOutlined,
  DeleteOutlined,
  TableColumnsType,
} from '@light-story/ui';
import { formatDate, formatChapterTitle } from '@/sdk';

export interface ChapterRow {
  id: string;
  story_id: string;
  chapter_number: number;
  title?: string;
  created_at?: string;
  images?: string[];
}

export interface AdminChaptersTableProps<T extends ChapterRow = ChapterRow> {
  chapters: T[];
  loading?: boolean;
  onEditChapter: (chapter: T) => void;
  onDeleteChapter: (chapterId: string, chapterNumber: number, storyId: string) => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  comics?: Array<{ id: string; title: string }>;
  selectedComicId?: string;
  onSelectComic?: (comicId: string) => void;
}

export function AdminChaptersTable<T extends ChapterRow = ChapterRow>({
  chapters,
  loading = false,
  onEditChapter,
  onDeleteChapter,
  searchValue,
  onSearchChange,
  comics,
  selectedComicId = 'all',
  onSelectComic,
}: AdminChaptersTableProps<T>) {
  const comicOptions = comics
    ? [
        { value: 'all', label: `Tất cả bộ truyện (${comics.length})` },
        ...comics.map((c) => ({ value: c.id, label: c.title })),
      ]
    : [];

  const columns: TableColumnsType<T> = [
    {
      title: 'Số Chương',
      dataIndex: 'chapter_number',
      key: 'chapter_number',
      sorter: (a: T, b: T) => a.chapter_number - b.chapter_number,
      render: (num: number) => (
        <span className="font-bold text-orange-500">Chapter {num}</span>
      ),
    },
    {
      title: 'Tên Chương',
      dataIndex: 'title',
      key: 'title',
      render: (val: string | undefined, record: T) => (
        <span className="font-semibold text-slate-900 dark:text-white">
          {val || formatChapterTitle(record.chapter_number)}
        </span>
      ),
    },
    {
      title: 'Số Trang Ảnh R2',
      dataIndex: 'images',
      key: 'images',
      render: (imgs: string[] | undefined) => (
        <Tag color="cyan" className="font-mono font-bold">
          {imgs?.length || 0} trang ảnh
        </Tag>
      ),
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (dt: string | undefined) => (
        <span className="text-slate-500 dark:text-slate-400 text-xs">
          {dt ? formatDate(dt) : '-'}
        </span>
      ),
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      align: 'right',
      render: (_: unknown, record: T) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEditChapter(record)}
            aria-label="Sửa chương"
            title="Sửa chương"
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => onDeleteChapter(record.id, record.chapter_number, record.story_id)}
            aria-label="Xóa chương"
            title="Xóa chương"
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Tìm kiếm số chương, tên chương..."
        filters={
          comics && onSelectComic ? (
            <Select
              value={selectedComicId}
              onChange={onSelectComic}
              options={comicOptions}
              style={{ width: 240, maxWidth: '100%' }}
              placeholder="Chọn bộ truyện"
            />
          ) : undefined
        }
      />

      <AdminTable<T>
        columns={columns}
        dataSource={chapters}
        loading={loading}
        rowKey="id"
        emptyText="Chưa có chương nào cho bộ truyện này."
      />
    </div>
  );
}

export default AdminChaptersTable;
