export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  zeroBased?: boolean;
  showing?: boolean;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function getPageNumbers(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 7) return range(1, total);

  const pages: (number | "ellipsis")[] = [];
  if (current <= 4) {
    pages.push(...range(1, 5), "ellipsis", total);
  } else if (current >= total - 3) {
    pages.push(1, "ellipsis", ...range(total - 4, total));
  } else {
    pages.push(
      1,
      "ellipsis",
      ...range(current - 1, current + 1),
      "ellipsis",
      total,
    );
  }
  return pages;
}

export default function Pagination(
  {
    page,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions,
    zeroBased = false,
    showing = true,
  }: PaginationProps,
) {
  if (totalPages <= 1) return null;

  const displayPage = zeroBased ? page + 1 : page;
  const pages = getPageNumbers(displayPage, totalPages);
  const startItem = (displayPage - 1) * pageSize + 1;
  const endItem = Math.min(displayPage * pageSize, totalItems);

  return (
    <div class="pagination">
      <div class="pagination-info">
        {showing && (
          <span class="pagination-summary">
            Showing {startItem}–{endItem} of {totalItems}
          </span>
        )}
        {onPageSizeChange && pageSizeOptions && (
          <select
            class="select pagination-size"
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.currentTarget.value));
            }}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        )}
      </div>

      <div class="pagination-controls">
        <button
          type="button"
          class="page-btn"
          disabled={displayPage <= 1}
          onClick={() => onPageChange(zeroBased ? 0 : 1)}
          aria-label="First page"
        >
          <span class="material-symbols-outlined" style={{ fontSize: "14px" }}>
            first_page
          </span>
        </button>
        <button
          type="button"
          class="page-btn"
          disabled={displayPage <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <span class="material-symbols-outlined" style={{ fontSize: "14px" }}>
            chevron_left
          </span>
        </button>

        {pages.map((item, i) =>
          item === "ellipsis"
            ? <span key={`e-${i}`} class="page-ellipsis">…</span>
            : (
              <button
                key={item}
                type="button"
                class={`page-btn${item === displayPage ? " active" : ""}`}
                onClick={() => onPageChange(zeroBased ? item - 1 : item)}
              >
                {item}
              </button>
            )
        )}

        <button
          type="button"
          class="page-btn"
          disabled={displayPage >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <span class="material-symbols-outlined" style={{ fontSize: "14px" }}>
            chevron_right
          </span>
        </button>
        <button
          type="button"
          class="page-btn"
          disabled={displayPage >= totalPages}
          onClick={() => onPageChange(zeroBased ? totalPages - 1 : totalPages)}
          aria-label="Last page"
        >
          <span class="material-symbols-outlined" style={{ fontSize: "14px" }}>
            last_page
          </span>
        </button>
      </div>
    </div>
  );
}
