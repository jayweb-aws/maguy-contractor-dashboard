/* Generic table used by every list in the portal. Mirrors Medtransport `components/dashboard/Table.tsx`:
   select-all / per-row checkboxes, the three-dot action menu as the last column, and the
   Pagination footer with its rows-per-page selector. Paginates client side. */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { PAGE_OPTIONS, paginate } from '@/demo/logic';
import { Pagination } from './Pagination';
import { TableActionDropdown } from './TableActionDropdown';

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** td classes */
  className?: string;
  /** th classes */
  headClassName?: string;
}

export interface TableState {
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  selected: Set<string>;
  setSelected: (next: Set<string>) => void;
  clearSelection: () => void;
}

/** Page / rows-per-page / selection state for one DataTable. Call `setPage(1)` when filters change. */
export function useTableState(initialLimit = 10): TableState {
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(initialLimit);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const setLimit = useCallback((l: number) => {
    setLimitState(l);
    setPage(1);
  }, []);
  const clearSelection = useCallback(() => setSelected(new Set()), []);
  return useMemo(
    () => ({ page, setPage, limit, setLimit, selected, setSelected, clearSelection }),
    [page, limit, setLimit, selected, clearSelection],
  );
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  /** already filtered + sorted; the table paginates */
  rows: T[];
  rowKey: (row: T) => string;
  table: TableState;
  /** checkbox column, default true */
  selectable?: boolean;
  isRowSelectable?: (row: T) => boolean;
  /** menu items for the three-dot column (rendered inside TableActionDropdown) */
  actions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  empty?: ReactNode;
  /** small print on the footer's left, below pagination */
  footerNote?: ReactNode;
  pageOptions?: number[];
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  table,
  selectable = true,
  isRowSelectable,
  actions,
  onRowClick,
  rowClassName,
  empty,
  footerNote,
  pageOptions = PAGE_OPTIONS,
  className,
}: DataTableProps<T>) {
  const { page, setPage, limit, setLimit, selected, setSelected } = table;
  const paged = useMemo(() => paginate(rows, page, limit), [rows, page, limit]);

  // keep the stored page inside the available range when rows shrink
  useEffect(() => {
    if (paged.page !== page) setPage(paged.page);
  }, [paged.page, page, setPage]);

  // drop selections that no longer exist in `rows` (filter changed, ride moved tab …)
  useEffect(() => {
    if (selected.size === 0) return;
    const live = new Set(rows.map(rowKey));
    let changed = false;
    const next = new Set<string>();
    selected.forEach((id) => {
      if (live.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelected(next);
  }, [rows, rowKey, selected, setSelected]);

  const pageRows = paged.rows;
  const selectableOnPage = pageRows.filter((r) => (isRowSelectable ? isRowSelectable(r) : true));
  const allOnPageSelected = selectableOnPage.length > 0 && selectableOnPage.every((r) => selected.has(rowKey(r)));
  const someOnPageSelected = selectableOnPage.some((r) => selected.has(rowKey(r)));

  const toggleAllOnPage = (value: boolean) => {
    const next = new Set(selected);
    for (const r of selectableOnPage) {
      if (value) next.add(rowKey(r));
      else next.delete(rowKey(r));
    }
    setSelected(next);
  };
  const toggleRow = (id: string, value: boolean) => {
    const next = new Set(selected);
    if (value) next.add(id);
    else next.delete(id);
    setSelected(next);
  };

  const colSpan = columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0);

  return (
    <div className={cn('w-full', className)}>
      <Table className="table-auto whitespace-nowrap text-xs md:text-sm">
        <TableHeader className="bg-tableHeader uppercase text-primaryGray [&_tr]:border-b-0">
          <TableRow className="hover:bg-transparent">
            {selectable && (
              <TableHead className="w-10 pl-4 pr-0 md:pl-6">
                <Checkbox
                  checked={allOnPageSelected ? true : someOnPageSelected ? 'indeterminate' : false}
                  onCheckedChange={(v) => toggleAllOnPage(v === true)}
                  aria-label="Select all"
                  disabled={selectableOnPage.length === 0}
                />
              </TableHead>
            )}
            {columns.map((c) => (
              <TableHead key={c.id} className={cn('h-11 text-xs font-normal md:text-[13px]', c.headClassName)}>
                {c.header}
              </TableHead>
            ))}
            {actions && <TableHead className="w-12 pr-4 text-right md:pr-6" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colSpan} className="whitespace-normal p-6">
                {empty ?? <p className="text-center text-sm text-primaryGray">No records found</p>}
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map((row) => {
              const id = rowKey(row);
              const isSelected = selected.has(id);
              const canSelect = isRowSelectable ? isRowSelectable(row) : true;
              return (
                <TableRow
                  key={id}
                  data-state={isSelected ? 'selected' : undefined}
                  className={cn(
                    'bg-card data-[state=selected]:bg-primary-muted',
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(row),
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && (
                    <TableCell className="w-10 pl-4 pr-0 md:pl-6" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        disabled={!canSelect}
                        onCheckedChange={(v) => toggleRow(id, v === true)}
                        aria-label="Select row"
                      />
                    </TableCell>
                  )}
                  {columns.map((c) => (
                    <TableCell key={c.id} className={cn('py-3 lg:py-4', c.className)}>
                      {c.cell(row)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="w-12 py-2 pr-4 text-right md:pr-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end">
                        <TableActionDropdown>{actions(row)}</TableActionDropdown>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <div className="border-t border-[#E6EBF3] px-4 lg:px-6">
        <Pagination
          currentPage={paged.page}
          totalPages={paged.totalPages}
          totalCount={paged.totalCount}
          from={paged.from}
          to={paged.to}
          limit={limit}
          setPage={setPage}
          setLimit={setLimit}
          pageOptions={pageOptions}
        />
        {footerNote && <p className="pb-3 text-xs text-primaryGray">{footerNote}</p>}
      </div>
    </div>
  );
}
