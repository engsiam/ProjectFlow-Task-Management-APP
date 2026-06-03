// Pagination utilities.

export type PageParams = {
  page: number;
  limit: number;
};

export type PageResult<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export const parsePageParams = (
  rawPage: string | number | undefined,
  rawLimit: string | number | undefined,
  maxLimit = 100,
): PageParams => {
  const page = Math.max(1, Number.parseInt(String(rawPage ?? "1"), 10) || 1);
  let limit = Number.parseInt(String(rawLimit ?? "20"), 10) || 20;
  if (limit < 1) limit = 20;
  if (limit > maxLimit) limit = maxLimit;
  return { page, limit };
};

export const buildPageResult = <T>(
  items: T[],
  total: number,
  params: PageParams,
): PageResult<T> => {
  const totalPages = Math.max(1, Math.ceil(total / params.limit));
  return {
    items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
};

export const skipTake = (params: PageParams) => ({
  skip: (params.page - 1) * params.limit,
  take: params.limit,
});

export const parseSort = (
  raw: string | undefined,
  allowed: string[],
  defaultField = "createdAt",
  defaultOrder: "asc" | "desc" = "desc",
): { field: string; order: "asc" | "desc" } => {
  if (!raw) return { field: defaultField, order: defaultOrder };
  const desc = raw.startsWith("-");
  const field = desc ? raw.slice(1) : raw;
  if (!allowed.includes(field)) return { field: defaultField, order: defaultOrder };
  return { field, order: desc ? "desc" : "asc" };
};
