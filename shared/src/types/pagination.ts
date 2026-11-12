export type PaginationParams = {
  page?: number;
  limit?: number;
  cursor?: string;
};

export type PaginatedResult<T> = {
  items: T[];
  nextCursor?: string | null;
  total?: number;
  page?: number;
  limit?: number;
};
