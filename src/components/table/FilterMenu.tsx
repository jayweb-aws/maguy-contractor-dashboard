/* Port of Medtransport `TableTopMenu` (search box + "Filter" menu with a FILTER BY list and a
   Sort submenu) and `ActiveFilters` (removable chips under the controls). */
import { Check, ChevronRight, ListFilter, Search, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  key: string;
  label: string;
  icon?: LucideIcon;
  options: FilterOption[];
}

export function FilterMenu({
  search,
  onSearch,
  searchPlaceholder = 'Search',
  filters,
  value,
  onChange,
  sortOptions,
  sortValue,
  onSortChange,
  showSearch = true,
  className,
}: {
  search?: string;
  onSearch?: (q: string) => void;
  searchPlaceholder?: string;
  filters: FilterDef[];
  value: Record<string, string | undefined>;
  onChange: (key: string, val: string | undefined) => void;
  sortOptions?: FilterOption[];
  sortValue?: string;
  onSortChange?: (val: string | undefined) => void;
  showSearch?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex w-full min-w-0 max-w-full gap-3 md:gap-4', className)}>
      {showSearch && (
        <div className="relative flex-1">
          <Search className="absolute bottom-0 left-3 top-0 my-auto h-[18px] w-[18px] text-slate-500" />
          <Input
            placeholder={searchPlaceholder}
            value={search ?? ''}
            onChange={(e) => onSearch?.(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            className="h-11 w-full px-9"
            aria-label={searchPlaceholder}
          />
        </div>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-11 shrink-0 justify-center gap-2 px-4 font-medium capitalize text-muted-foreground"
            aria-label="Filter"
          >
            <ListFilter className="h-[18px] w-[18px]" /> Filter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[220px] p-0">
          <h6 className="px-2 py-3 text-xs uppercase text-primaryGray">Filter by</h6>
          <div className="mx-1 pb-1 text-muted-foreground">
            {filters.map((f) => {
              const Icon = f.icon;
              return (
                <DropdownMenuSub key={f.key}>
                  <DropdownMenuSubTrigger className="mb-[4px] cursor-pointer px-2 py-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-primaryBlack">
                      {Icon && <Icon className="h-5 w-5 text-headingBlack" />}
                      {f.label}
                      {value[f.key] && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-80 min-w-[220px] overflow-y-auto px-2 py-3" sideOffset={12}>
                    <DropdownMenuLabel className="text-xs font-normal uppercase text-primaryGray">{f.label}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={value[f.key] ?? ''}
                      onValueChange={(v) => onChange(f.key, v || undefined)}
                    >
                      {f.options.map((o) => (
                        <DropdownMenuRadioItem key={o.value} value={o.value} className="pl-8 font-medium">
                          {o.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                    {value[f.key] && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-xs text-brand-red" onSelect={() => onChange(f.key, undefined)}>
                          Clear {f.label.toLowerCase()}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            })}
          </div>
          {sortOptions && sortOptions.length > 0 && (
            <div className="px-1 pb-1">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="w-full justify-between rounded-md border border-input bg-background px-3 py-2 text-base font-medium text-primaryGray [&>svg]:hidden">
                  Sort
                  <ChevronRight className="!block h-4 w-4" />
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-[220px] px-2 py-3" sideOffset={12}>
                  <DropdownMenuLabel className="text-xs font-normal uppercase text-primaryGray">Sort by</DropdownMenuLabel>
                  {sortOptions.map((o) => (
                    <DropdownMenuItem
                      key={o.value}
                      className="relative pl-8 font-medium"
                      onSelect={() => onSortChange?.(sortValue === o.value ? undefined : o.value)}
                    >
                      {sortValue === o.value && <Check className="absolute left-2 h-4 w-4" />}
                      {o.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export interface ActiveFilterChip {
  key: string;
  label: string;
  value: string;
}

export function ActiveFilters({
  chips,
  onRemove,
  onClearAll,
  className,
}: {
  chips: ActiveFilterChip[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
  className?: string;
}) {
  if (chips.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {chips.map((c) => (
        <div key={c.key} className="flex items-center overflow-hidden rounded bg-primary/20 text-xs capitalize">
          <span className="px-2 capitalize">
            {c.label}: {c.value}
          </span>
          <button
            type="button"
            aria-label={`Remove ${c.label} filter`}
            className="flex-center cursor-pointer bg-primary/10 px-1 py-1.5 transition-all duration-300 hover:bg-destructive hover:text-white"
            onClick={() => onRemove(c.key)}
          >
            <X className="h-3" />
          </button>
        </div>
      ))}
      {onClearAll && chips.length > 1 && (
        <button type="button" className="text-xs text-primary hover:underline" onClick={onClearAll}>
          Clear all
        </button>
      )}
    </div>
  );
}
