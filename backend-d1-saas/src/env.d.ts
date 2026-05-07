interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run<T = Record<string, unknown>>(): Promise<T>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface Env {
  CONTROL_DB: D1Database;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  TENANT_DATABASE_PREFIX: string;
  ADMIN_API_KEY: string;
}
