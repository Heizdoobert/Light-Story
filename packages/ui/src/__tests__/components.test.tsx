import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MetricCard } from '../components/card';
import { FormModal } from '../components/modal';
import { FilterBar } from '../components/filter';
import { LightStoryThemeProvider } from '../theme';

describe('MetricCard', () => {
  it('renders title, value, prefix, suffix, and trend direction', () => {
    render(
      <LightStoryThemeProvider>
        <MetricCard
          title="Tổng lượt xem"
          value="1.2M"
          prefix="~"
          suffix="views"
          trend={{ value: '12%', direction: 'up', label: 'vs tháng trước' }}
        />
      </LightStoryThemeProvider>
    );

    expect(screen.getByText('Tổng lượt xem')).toBeInTheDocument();
    expect(screen.getByText('1.2M')).toBeInTheDocument();
    expect(screen.getByText('~')).toBeInTheDocument();
    expect(screen.getByText('views')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();
    expect(screen.getByText('vs tháng trước')).toBeInTheDocument();
  });

  it('renders skeleton when loading is true', () => {
    const { container } = render(
      <LightStoryThemeProvider>
        <MetricCard title="Loading Stat" value="0" loading={true} />
      </LightStoryThemeProvider>
    );

    expect(container.querySelector('.ant-skeleton')).toBeInTheDocument();
  });
});

describe('FormModal', () => {
  it('renders title, children, and calls onSubmit when ok button is clicked', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const onCancel = vi.fn();

    render(
      <LightStoryThemeProvider>
        <FormModal
          title="Tạo Chapter Mới"
          open={true}
          onSubmit={onSubmit}
          onCancel={onCancel}
          submitText="Xác nhận"
        >
          <div>Nội dung form chapter</div>
        </FormModal>
      </LightStoryThemeProvider>
    );

    expect(screen.getByText('Tạo Chapter Mới')).toBeInTheDocument();
    expect(screen.getByText('Nội dung form chapter')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Xác nhận/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  it('displays errorMessage when provided', () => {
    render(
      <LightStoryThemeProvider>
        <FormModal
          title="Modal Lỗi"
          open={true}
          onCancel={() => {}}
          errorMessage="Tên chapter không được để trống"
        >
          <div>Form content</div>
        </FormModal>
      </LightStoryThemeProvider>
    );

    expect(screen.getByText('Tên chapter không được để trống')).toBeInTheDocument();
  });
});

describe('FilterBar', () => {
  it('triggers onSearchChange when typing in the search box', () => {
    const onSearchChange = vi.fn();
    render(
      <LightStoryThemeProvider>
        <FilterBar
          searchValue="manga"
          onSearchChange={onSearchChange}
          searchPlaceholder="Tìm theo tên..."
        />
      </LightStoryThemeProvider>
    );

    const input = screen.getByPlaceholderText('Tìm theo tên...');
    fireEvent.change(input, { target: { value: 'manhwa' } });

    expect(onSearchChange).toHaveBeenCalledWith('manhwa');
  });

  it('triggers onReset when reset button is clicked', () => {
    const onReset = vi.fn();
    render(
      <LightStoryThemeProvider>
        <FilterBar onReset={onReset} resetText="Làm mới bộ lọc" />
      </LightStoryThemeProvider>
    );

    const resetBtn = screen.getByRole('button', { name: /Làm mới bộ lọc/i });
    fireEvent.click(resetBtn);

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
