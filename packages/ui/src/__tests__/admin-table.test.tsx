import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AdminTable } from '../components/table';
import { LightStoryThemeProvider } from '../theme';

interface TestRow {
  id: string;
  name: string;
  status: string;
}

describe('AdminTable', () => {
  const columns = [
    { title: 'Tên', dataIndex: 'name', key: 'name' },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status' },
  ];

  it('renders table data rows and columns', () => {
    const data: TestRow[] = [
      { id: '1', name: 'One Piece', status: 'Ongoing' },
      { id: '2', name: 'Naruto', status: 'Completed' },
    ];

    render(
      <LightStoryThemeProvider>
        <AdminTable<TestRow> columns={columns} dataSource={data} rowKey="id" />
      </LightStoryThemeProvider>
    );

    expect(screen.getAllByText('Tên').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Trạng thái').length).toBeGreaterThan(0);
    expect(screen.getByText('One Piece')).toBeInTheDocument();
    expect(screen.getByText('Naruto')).toBeInTheDocument();
    expect(screen.getByText('Ongoing')).toBeInTheDocument();
  });

  it('renders custom empty text when dataSource is empty', () => {
    render(
      <LightStoryThemeProvider>
        <AdminTable<TestRow>
          columns={columns}
          dataSource={[]}
          emptyText="Không tìm thấy truyện nào"
        />
      </LightStoryThemeProvider>
    );

    expect(screen.getByText('Không tìm thấy truyện nào')).toBeInTheDocument();
  });

  it('disables pagination when pagination={false}', () => {
    const data: TestRow[] = [{ id: '1', name: 'Solo Leveling', status: 'Completed' }];

    const { container } = render(
      <LightStoryThemeProvider>
        <AdminTable<TestRow>
          columns={columns}
          dataSource={data}
          pagination={false}
        />
      </LightStoryThemeProvider>
    );

    expect(container.querySelector('.ant-pagination')).not.toBeInTheDocument();
  });
});
