/* Shown above a table while rows are checked — the contractor's version of Medtransport's
   "Select Status" control in DispatchTopAction that appears once rows are selected. */
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BulkActionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="flex flex-wrap items-center gap-2 border-b border-primary/20 bg-primary-muted px-4 py-2 text-sm lg:px-6"
    >
      <span className="mr-2 font-medium text-headingBlack">
        {count} selected
      </span>
      {children}
      <Button variant="ghost" className="ml-auto h-8 gap-1 px-2 text-xs text-primaryGray" onClick={onClear}>
        <X className="h-3.5 w-3.5" /> Clear
      </Button>
    </div>
  );
}
