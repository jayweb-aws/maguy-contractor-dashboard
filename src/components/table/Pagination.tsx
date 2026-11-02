/* Port of Medtransport `components/dashboard/Pagination.tsx`: prev / next chevrons,
   "1-10 of 37 results" and the "Rows per page" selector. */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PAGE_OPTIONS } from '@/demo/logic';

export interface PaginationProps {
  className?: string;
  pageOptions?: number[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  from: number;
  to: number;
  limit: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
}

export function Pagination({
  className,
  pageOptions = PAGE_OPTIONS,
  currentPage,
  totalPages,
  totalCount,
  from,
  to,
  limit,
  setPage,
  setLimit,
}: PaginationProps) {
  if (totalCount === 0) return null;
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 py-3', className)}>
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            aria-label="Previous page"
            className="disabled:cursor-not-allowed disabled:opacity-30"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="max-md:h-4 max-md:w-4" />
          </button>
          <button
            type="button"
            aria-label="Next page"
            className="disabled:cursor-not-allowed disabled:opacity-30"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="max-md:h-4 max-md:w-4" />
          </button>
        </div>
        <p className="flex-1 text-sm text-muted-foreground max-md:text-xs">
          {from}-{to} of {totalCount} results
        </p>
      </div>

      <label className="ml-auto flex items-center justify-end text-[#8A8F96] max-md:text-xs">
        Rows per page
        <select
          aria-label="Rows per page"
          className="block min-h-fit cursor-pointer rounded-none border-none bg-transparent !pl-1 !pr-6 text-sm text-gray-900"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
        >
          {pageOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
