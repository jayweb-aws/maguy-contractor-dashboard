/* Port of Medtransport `components/dashboard/utils/tabs`: the underline tab strip above a
   table with the small record-count badge (RecordsCounterBadge). */
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export function RecordsCounterBadge({ count }: { count: number }) {
  return (
    <Badge className="ml-2 rounded-md bg-secondary px-1.5 py-0 text-[10px] text-primaryBlue">{count}</Badge>
  );
}

export function TableTabsList({
  children,
  className,
  containerClassName,
}: {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}) {
  return (
    <ScrollArea orientation="horizontal" className={cn('mb-4 md:mb-6', containerClassName)}>
      <TabsList className={cn('space-x-5 border-b border-muted text-lightTextGray', className)}>{children}</TabsList>
    </ScrollArea>
  );
}

export function TableTabsTrigger({
  className,
  label,
  value,
  documentCount,
  onClick,
}: {
  className?: string;
  label: string;
  value: string;
  documentCount?: number;
  onClick?: () => void;
}) {
  return (
    <TabsTrigger onClick={onClick} className={cn('flex items-center gap-2 text-[16px]', className)} value={value}>
      <span className="flex cursor-pointer items-center gap-1.5">
        {label}
        {documentCount !== undefined && <RecordsCounterBadge count={documentCount} />}
      </span>
    </TabsTrigger>
  );
}
