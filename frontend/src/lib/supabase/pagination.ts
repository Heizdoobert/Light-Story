/**
 * Standard Supabase PostgREST pagination utility using { count: 'exact' }.
 */

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Calculates zero-based PostgREST range bounds [from, to] for query.range(from, to).
 */
export function calculateRange(page = 1, pageSize = 20): { from: number; to: number } {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  return { from, to };
}

/**
 * Normalizes query result into standard PaginatedResult.
 */
export function toPaginatedResult<T>(
  data: T[] | null,
  count: number | null,
  page = 1,
  pageSize = 20,
): PaginatedResult<T> {
  const items = data ?? [];
  const total = count ?? 0;
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.ceil(total / safePageSize);

  return {
    items,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}
