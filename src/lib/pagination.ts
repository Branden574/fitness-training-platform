/**
 * Shared pagination utilities for API routes.
 */

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

/**
 * Parse pagination params from URL search params.
 * Returns safe, bounded values.
 */
export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const rawSize = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(Math.max(1, rawSize), MAX_PAGE_SIZE);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * Build a paginated response envelope.
 */
export function paginatedResponse<T>(
  data: T[],
  totalCount: number,
  params: PaginationParams
) {
  return {
    data,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / params.pageSize),
    },
  };
}
