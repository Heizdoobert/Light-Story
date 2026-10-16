/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabaseClient';
import { useQuery, UseQueryResult, QueryKey } from '@tanstack/react-query';

/**
 * Supported filter operators.
 */
export type FilterOperator = 'eq' | 'neq' | 'in';

/**
 * A single filter description.
 */
export interface Filter {
  /** Column name in the table */
  field: string;
  /** Operator */
  op: FilterOperator;
  /** Value – for `in` this can be an array */
  value: unknown;
}

/**
 * Parameters accepted by the SDK query helpers.
 */
export interface QueryParams {
  /** Optional array of filters */
  filter?: Filter[];
  /** Full‑text search term */
  search?: string;
  /** Number of rows to return – unique result set (no duplicate rows) */
  limit?: number;
  /** Offset for pagination – optional */
  offset?: number;
}

/**
 * Convert a {@link QueryParams} object to a query‑string that can be appended to a URL.
 */
export function paramsToQueryString(params: QueryParams): string {
  const parts: string[] = [];
  if (params.filter) {
    for (const f of params.filter) {
      const encodedValue = encodeURIComponent(
        Array.isArray(f.value) ? f.value.join(',') : String(f.value ?? '')
      );
      parts.push(`${f.field}[${f.op}]=${encodedValue}`);
    }
  }
  if (params.search) {
    parts.push(`search=${encodeURIComponent(params.search)}`);
  }
  if (params.limit !== undefined) parts.push(`limit=${params.limit}`);
  if (params.offset !== undefined) parts.push(`offset=${params.offset}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * Parse a query‑string back into a {@link QueryParams} object.
 */
export function queryStringToParams(qs: string): QueryParams {
  const url = new URL('http://placeholder' + (qs.startsWith('?') ? qs : `?${qs}`));
  const params: QueryParams = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (key === 'search') {
      params.search = value;
    } else if (key === 'limit') {
      params.limit = Number(value);
    } else if (key === 'offset') {
      params.offset = Number(value);
    } else {
      const match = key.match(/^(.*)\[(eq|neq|in)\]$/);
      if (match) {
        const [, field, op] = match;
        const decoded = decodeURIComponent(value);
        const filter: Filter = {
          field,
          op: op as FilterOperator,
          value: op === 'in' ? decoded.split(',') : decoded,
        };
        (params.filter = params.filter ?? []).push(filter);
      }
    }
  }
  return params;
}

/**
 * Internal helper that retries a promise‑based operation.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 200): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries) throw err;
      await new Promise((res) => setTimeout(res, delayMs * Math.pow(2, attempt - 1)));
    }
  }
}

/**
 * Execute a Supabase query based on {@link QueryParams}.
 */
export async function executeQuery<T = unknown>(
  table: string,
  params: QueryParams
): Promise<T[]> {
  // Use `any` for the query builder to simplify chaining.
  let query: any = supabase.from(table).select('*');

  if (params.filter) {
    for (const f of params.filter) {
      switch (f.op) {
        case 'eq':
          query = query.eq(f.field as any, f.value);
          break;
        case 'neq':
          query = query.neq(f.field as any, f.value);
          break;
        case 'in':
          query = query.in(f.field as any, Array.isArray(f.value) ? f.value : [f.value]);
          break;
      }
    }
  }

  if (params.search) {
    // Assume a `content` column is indexed for full‑text search.
    query = query.textSearch('content', params.search, {
      config: 'english',
      type: 'websearch',
    });
  }

  if (params.limit !== undefined) query = query.limit(params.limit);
  if (params.offset !== undefined && params.limit !== undefined) {
    query = query.range(params.offset, params.offset + params.limit - 1);
  }

  const result = await withRetry(() => query as any);
  const { data, error } = result as any;
  if (error) {
    throw error;
  }
  return data as T[];
}

/**
 * React‑Query hook that builds a stable `queryKey`.
 * Compatible with TanStack Query v5 (options‑object style).
 */
  export function useSupabaseQuery<T = unknown>(
    table: string,
    params: QueryParams
  ): UseQueryResult<T[], Error> {
    const queryKey: QueryKey = ['supabase', table, params];
    return useQuery<T[], Error, T[], QueryKey>({
      queryKey,
      queryFn: () => executeQuery<T>(table, params),
    });
  }


export const SDK = {
  paramsToQueryString,
  queryStringToParams,
  executeQuery,
  useSupabaseQuery,
};
