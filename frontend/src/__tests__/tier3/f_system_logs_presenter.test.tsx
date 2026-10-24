import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SystemLogsPage } from '@/components/admin/SystemLogsPage';
import type { LogEntry } from '@/sdk/logger/types';

vi.mock('@/context/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'VI',
    setLanguage: vi.fn(),
    t: (key: string) => key,
  }),
}));

const mockLogs: LogEntry[] = [
  {
    id: 'log-1',
    level: 'error',
    message: 'Payment gateway connection failed',
    service: 'billing',
    metadata: { orderId: 'ord_123' },
    error_stack: 'Error: Connection timeout\n  at checkout.ts:42:15',
    created_at: '2026-10-16T10:00:00Z',
  },
  {
    id: 'log-2',
    level: 'info',
    message: 'User authentication successful',
    service: 'auth',
    metadata: { userId: 'usr_456' },
    created_at: '2026-10-16T10:05:00Z',
  },
];

describe('SystemLogsPage Component & Interactions', () => {
  const setLevelFilterMock = vi.fn();
  const setSearchQueryMock = vi.fn();
  const setPageMock = vi.fn();
  const setSelectedLogMock = vi.fn();
  const refreshMock = vi.fn();

  const defaultProps = {
    logs: mockLogs,
    total: 2,
    page: 1,
    pageSize: 50,
    totalPages: 1,
    isLoading: false,
    error: null,
    levelFilter: 'ALL',
    serviceFilter: 'ALL',
    searchQuery: '',
    selectedLog: null,
    setLevelFilter: setLevelFilterMock,
    setServiceFilter: vi.fn(),
    setSearchQuery: setSearchQueryMock,
    setPage: setPageMock,
    setSelectedLog: setSelectedLogMock,
    refresh: refreshMock,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders log list with badges, service names, and messages', () => {
    render(<SystemLogsPage {...defaultProps} />);

    expect(screen.getByText('admin_system_logs_title')).toBeInTheDocument();
    expect(screen.getByText('Payment gateway connection failed')).toBeInTheDocument();
    expect(screen.getByText('User authentication successful')).toBeInTheDocument();
    expect(screen.getByText('billing')).toBeInTheDocument();
    expect(screen.getByText('auth')).toBeInTheDocument();
    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText('INFO')).toBeInTheDocument();
  });

  it('triggers level filter change when dropdown selection changes', () => {
    render(<SystemLogsPage {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'error' } });

    expect(setLevelFilterMock).toHaveBeenCalledWith('error');
  });

  it('triggers search query change when search input changes', () => {
    render(<SystemLogsPage {...defaultProps} />);

    const input = screen.getByPlaceholderText('log_search_placeholder');
    fireEvent.change(input, { target: { value: 'payment' } });

    expect(setSearchQueryMock).toHaveBeenCalledWith('payment');
  });

  it('opens detail modal when a row is clicked', () => {
    render(<SystemLogsPage {...defaultProps} />);

    const rowMessage = screen.getByText('Payment gateway connection failed');
    fireEvent.click(rowMessage);

    expect(setSelectedLogMock).toHaveBeenCalledWith(mockLogs[0]);
  });

  it('renders detail modal with stack trace and metadata when selectedLog is provided', () => {
    render(<SystemLogsPage {...defaultProps} selectedLog={mockLogs[0]} />);

    expect(screen.getByText('log_detail_title')).toBeInTheDocument();
    expect(screen.getByText('Error: Connection timeout at checkout.ts:42:15', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/"orderId": "ord_123"/, { exact: false })).toBeInTheDocument();

    const closeBtn = screen.getByLabelText('Close modal');
    fireEvent.click(closeBtn);

    expect(setSelectedLogMock).toHaveBeenCalledWith(null);
  });

  it('renders empty state when there are no logs', () => {
    render(<SystemLogsPage {...defaultProps} logs={[]} total={0} />);

    expect(screen.getByText('log_empty')).toBeInTheDocument();
  });

  it('renders loading state when isLoading is true', () => {
    render(<SystemLogsPage {...defaultProps} isLoading={true} />);

    expect(screen.getByText('log_loading')).toBeInTheDocument();
  });
});
