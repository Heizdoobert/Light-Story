import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  logger,
  setLevel,
  getLevel,
  levels,
  redactMetadata,
  captureToSentry,
  persistLogToSupabase,
  setSupabaseClientForLogger,
} from '../../sdk/logger';
import type { LogEntry } from '../../sdk/logger/types/loggerTypes';

describe('Logger & Debug Diagnostics Suite', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  describe('1. Log Levels & Dynamic Switching', () => {
    it('switches default level with NODE_ENV', async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      vi.resetModules();
      const { logger: devLogger } = await import('../../sdk/logger');
      expect(devLogger.getLevel()).toBe(devLogger.levels.DEBUG);

      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      vi.resetModules();
      const { logger: prodLogger } = await import('../../sdk/logger');
      expect(prodLogger.getLevel()).toBe(prodLogger.levels.ERROR);
    });

    it('allows dynamic level mutation via string and number', () => {
      setLevel('INFO');
      expect(getLevel()).toBe(levels.INFO);

      setLevel('WARN');
      expect(getLevel()).toBe(levels.WARN);

      setLevel(levels.ERROR);
      expect(getLevel()).toBe(levels.ERROR);
    });

    it('respects log level thresholds for console output', () => {
      const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      setLevel('ERROR');
      logger.debug('suppressed message');
      expect(consoleDebugSpy).not.toHaveBeenCalled();

      logger.error('visible error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('2. Metadata Redaction & Security Masking', () => {
    it('redacts sensitive keys including password, token, secret, apiKey', () => {
      const sensitiveData = {
        username: 'alice',
        password: 'super-secret-password',
        auth_token: 'jwt-token-12345',
        api_key: 'sk_live_abcdef',
        nested: {
          client_secret: 'top-secret',
          publicId: 'uuid-1',
        },
      };

      const sanitized = redactMetadata(sensitiveData);
      expect(sanitized.username).toBe('alice');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.auth_token).toBe('[REDACTED]');
      expect(sanitized.api_key).toBe('[REDACTED]');
      expect(sanitized.nested.client_secret).toBe('[REDACTED]');
      expect(sanitized.nested.publicId).toBe('uuid-1');
    });

    it('handles arrays and circular references safely', () => {
      const circularObj: any = { name: 'cycle' };
      circularObj.self = circularObj;

      const arrayData = [{ password: '123' }, 'plain string', circularObj];
      const sanitized = redactMetadata(arrayData);

      expect(Array.isArray(sanitized)).toBe(true);
      expect(sanitized[0].password).toBe('[REDACTED]');
      expect(sanitized[1]).toBe('plain string');
      expect(sanitized[2].self).toBe('[Circular]');
    });

    it('returns primitive values untouched', () => {
      expect(redactMetadata(null)).toBeNull();
      expect(redactMetadata('test')).toBe('test');
      expect(redactMetadata(42)).toBe(42);
    });
  });

  describe('3. Sentry Transport Safety', () => {
    it('executes safely without error when global Sentry is undefined', () => {
      const entry: LogEntry = {
        level: 'error',
        message: 'Test Sentry Absent',
        service: 'test-service',
      };

      expect(() => captureToSentry(entry, new Error('Absent Sentry'))).not.toThrow();
    });

    it('forwards exception to global Sentry when configured', () => {
      const mockCaptureException = vi.fn();
      const mockCaptureMessage = vi.fn();
      (globalThis as any).Sentry = {
        captureException: mockCaptureException,
        captureMessage: mockCaptureMessage,
      };

      const testError = new Error('Database unreachable');
      const entry: LogEntry = {
        level: 'error',
        message: 'DB failed',
        service: 'kv-worker',
        metadata: { retryCount: 3 },
      };

      captureToSentry(entry, testError);
      expect(mockCaptureException).toHaveBeenCalledWith(testError, {
        tags: { service: 'kv-worker', level: 'error' },
        extra: { retryCount: 3 },
      });

      delete (globalThis as any).Sentry;
    });

    it('forwards error message to Sentry when no Error object is passed', () => {
      const mockCaptureMessage = vi.fn();
      (globalThis as any).Sentry = {
        captureMessage: mockCaptureMessage,
      };

      const entry: LogEntry = {
        level: 'error',
        message: 'Critical system timeout',
        service: 'frontend',
      };

      captureToSentry(entry);
      expect(mockCaptureMessage).toHaveBeenCalledWith('Critical system timeout', {
        level: 'error',
        tags: { service: 'frontend', level: 'error' },
        extra: undefined,
      });

      delete (globalThis as any).Sentry;
    });
  });

  describe('4. Supabase Transport Non-blocking Persistence', () => {
    it('persists structured log to supabase table when client is configured', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
      const mockClient = { from: mockFrom } as any;

      setSupabaseClientForLogger(mockClient);

      const entry: LogEntry = {
        level: 'error',
        message: 'Failed user operation',
        service: 'frontend',
        metadata: { comicId: 'comic-99' },
        error_stack: 'Error: at func...',
        user_id: 'user-123',
        request_id: 'req_123456',
      };

      await persistLogToSupabase(entry);

      expect(mockFrom).toHaveBeenCalledWith('system_logs');
      expect(mockInsert).toHaveBeenCalledWith([
        {
          level: 'error',
          message: 'Failed user operation',
          service: 'frontend',
          metadata: { comicId: 'comic-99' },
          error_stack: 'Error: at func...',
          user_id: 'user-123',
          request_id: 'req_123456',
        },
      ]);

      setSupabaseClientForLogger(null);
    });

    it('swallows Supabase transport errors gracefully without interrupting execution', async () => {
      const mockFrom = vi.fn().mockImplementation(() => {
        throw new Error('Supabase network offline');
      });
      setSupabaseClientForLogger({ from: mockFrom } as any);

      const entry: LogEntry = {
        level: 'error',
        message: 'Crash test',
      };

      await expect(persistLogToSupabase(entry)).resolves.not.toThrow();

      setSupabaseClientForLogger(null);
    });
  });

  describe('5. Integrated Structured Logging Dispatch', () => {
    it('dispatches structured log and sanitizes sensitive payload on logger.error', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockCaptureException = vi.fn();
      (globalThis as any).Sentry = { captureException: mockCaptureException };

      setLevel('DEBUG');

      const testErr = new Error('Sensitive transaction failed');
      logger.error(testErr, {
        service: 'payments',
        requestId: 'req_test_999',
        metadata: {
          secret_token: 'super_secret_value',
          item: 'subscription',
        },
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockCaptureException).toHaveBeenCalledWith(testErr, expect.objectContaining({
        tags: { service: 'payments', level: 'error' },
        extra: {
          secret_token: '[REDACTED]',
          item: 'subscription',
        },
      }));

      delete (globalThis as any).Sentry;
    });
  });
});
