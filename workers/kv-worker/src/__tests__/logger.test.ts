import { describe, it, expect, vi, afterEach } from 'vitest';
import { logEvent } from '../utils/logger';

describe('Edge Worker Logger & Telemetry Suite', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('outputs structured JSON event to console.log for info level', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await logEvent({}, 'story_view_counted', {
      storyId: 'story-123',
      views: 42,
    });

    expect(consoleSpy).toHaveBeenCalled();
    const logCall = consoleSpy.mock.calls[0];
    expect(logCall[0]).toBe('[Event:story_view_counted]');
    const parsed = JSON.parse(logCall[1]);
    expect(parsed.event).toBe('story_view_counted');
    expect(parsed.level).toBe('info');
    expect(parsed.storyId).toBe('story-123');
    expect(parsed.views).toBe(42);
    expect(parsed.timestamp).toBeDefined();
  });

  it('outputs to console.error when level is error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await logEvent({}, 'redis_sync_failed', { error: 'Connection refused' }, { level: 'error' });

    expect(consoleErrorSpy).toHaveBeenCalled();
    const call = consoleErrorSpy.mock.calls[0];
    expect(call[0]).toBe('[Event:redis_sync_failed]');
    const parsed = JSON.parse(call[1]);
    expect(parsed.level).toBe('error');
    expect(parsed.error).toBe('Connection refused');
  });

  it('safely serializes circular references without throwing', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const circular: any = { name: 'cyclic' };
    circular.loop = circular;

    await expect(logEvent({}, 'circular_event', circular)).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    const call = consoleSpy.mock.calls[0];
    const parsed = JSON.parse(call[1]);
    expect(parsed.loop.loop).toBe('[Circular]');
  });

  it('ingests datapoints into Cloudflare Analytics Engine when binding exists', async () => {
    const mockWriteDataPoint = vi.fn();
    const env = {
      ANALYTICS_DATA: {
        writeDataPoint: mockWriteDataPoint,
      },
    };

    await logEvent(env, 'user_login', {
      userId: 'usr_abc',
      ip: '127.0.0.1',
      message: 'Successful login',
    });

    expect(mockWriteDataPoint).toHaveBeenCalledWith({
      indexes: ['user_login'],
      blobs: ['user_login', 'usr_abc', '127.0.0.1', 'Successful login'],
      doubles: [expect.any(Number)],
    });
  });

  it('never throws even if writeDataPoint fails', async () => {
    const env = {
      ANALYTICS_DATA: {
        writeDataPoint: () => {
          throw new Error('Analytics engine buffer full');
        },
      },
    };

    await expect(logEvent(env, 'safe_event', {})).resolves.not.toThrow();
  });
});
