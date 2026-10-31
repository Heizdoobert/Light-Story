export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id?: string;
  level: LogLevel;
  message: string;
  service?: string;
  metadata?: Record<string, unknown>;
  error_stack?: string | null;
  user_id?: string | null;
  request_id?: string | null;
  created_at?: string;
}

export interface LoggerPayloadOptions {
  service?: string;
  metadata?: Record<string, unknown>;
  error?: Error | unknown;
  userId?: string | null;
  requestId?: string | null;
}

export interface LoggerConfig {
  service?: string;
  sentryDsn?: string;
  persistToSupabase?: boolean;
}
