import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoNote, EmptyState, PageHeader, formatDateLong } from '@/components/shared';
import { DataTable, useTableState, type Column } from '@/components/table/DataTable';
import { ActiveFilters, FilterMenu, type FilterDef } from '@/components/table/FilterMenu';
import { BulkActionBar } from '@/components/table/BulkActionBar';
import { TableActionDropdownItem } from '@/components/table/TableActionDropdown';
import { useDemo } from '@/demo/store';
import type { Contract } from '@/demo/types';

const STATUS: Record<Contract['status'], { label: string; variant: 'greenish' | 'yellowish' | 'grayish' }> = {
  active: { label: 'Active', variant: 'greenish' },
  'pending-signature': { label: 'Pending Signature', variant: 'yellowish' },
  expired: { label: 'Expired', variant: 'grayish' },
};

export default function Contracts() {
  const { contracts } = useDemo();
  const [filters, setFilters] = useState<{ search?: string; type?: string; status?: string }>({});
  const table = useTableState(10);
  const pending = contracts.filter((c) => c.status === 'pending-signature');

  const rows = useMemo(() => {
    const needle = (filters.search ?? '').trim().toLowerCase();
    return contracts.filter(
      (c) =>
        (!filters.type || c.type === filters.type) &&
        (!filters.status || c.status === filters.status) &&
        (!needle || `${c.title} ${c.type}`.toLowerCase().includes(needle)),
    );
  }, [contracts, filters]);

  const setFilter = (key: string, val: string | undefined) => {
    setFilters((f) => ({ ...f, [key]: val }));
    table.setPage(1);
  };
  const filterDefs: FilterDef[] = [
    { key: 'type', label: 'Type', options: [...new Set(contracts.map((c) => c.type))].map((t) => ({ value: t, label: t })) },
    { key: 'status', label: 'Status', options: (Object.keys(STATUS) as Contract['status'][]).map((s) => ({ value: s, label: STATUS[s].label })) },
  ];
  const chips = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([key, value]) => ({
      key,
      label: key === 'type' ? 'Type' : key === 'status' ? 'Status' : 'Search',
      value: key === 'status' ? STATUS[value as Contract['status']].label : value!,
    }));
  const stub = (what: string) => toast(`${what} is not part of this prototype`);

  const columns: Column<Contract>[] = [
    {
      id: 'title',
      header: 'Agreement',
      className: 'whitespace-normal font-medium text-headingBlack',
      cell: (c) => (
        <Link to={`/contracts/${c.id}`} className="inline-flex items-center gap-2 text-primary hover:underline">
          <FileText className="h-4 w-4 shrink-0 text-primaryGray" /> {c.title}
        </Link>
      ),
    },
    { id: 'type', header: 'Type', cell: (c) => c.type },
    { id: 'effective', header: 'Effective', cell: (c) => formatDateLong(c.effective) },
    { id: 'expires', header: 'Expires', cell: (c) => (c.expires ? formatDateLong(c.expires) : 'Ongoing') },
    { id: 'signed', header: 'Signed', cell: (c) => (c.signedAt ? formatDateLong(c.signedAt) : '—') },
    {
      id: 'status',
      header: 'Status',
      cell: (c) => (
        <Badge variant={STATUS[c.status].variant} withDot>
          {STATUS[c.status].label}
        </Badge>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      cell: (c) =>
        c.status === 'pending-signature' ? (
          <Button variant="bluish" onClick={() => stub('E-signature')}>
            Review &amp; sign
          </Button>
        ) : (
          <Button variant="outline" asChild>
            <Link to={`/contracts/${c.id}`}>View</Link>
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Contracts & Agreements"
        description="Agreements between your company and Maguy Medical Transport. Rate schedules are set by Maguy."
      />
      {pending.length > 0 && (
        <div className="mb-4">
          <DemoNote>
            {pending.length} agreement{pending.length === 1 ? '' : 's'} waiting for your signature. Signing is not part of this prototype.
          </DemoNote>
        </div>
      )}
      <Card className="p-0 lg:p-0">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <h2 className="card-title text-headingBlack">Agreements</h2>
          <div className="lg:w-[420px]">
            <FilterMenu
              search={filters.search}
              onSearch={(q) => setFilter('search', q || undefined)}
              searchPlaceholder="Search agreement"
              filters={filterDefs}
              value={filters}
              onChange={setFilter}
            />
          </div>
        </div>
        <ActiveFilters chips={chips} onRemove={(k) => setFilter(k, undefined)} onClearAll={() => setFilters({})} className="border-t border-[#E6EBF3] px-4 py-3 lg:px-6" />
        <BulkActionBar count={table.selected.size} onClear={table.clearSelection}>
          <Button variant="outline" className="h-8" onClick={() => stub('Download selected')}>
            Download {table.selected.size}
          </Button>
        </BulkActionBar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          table={table}
          actions={(c) => (
            <>
              <TableActionDropdownItem label="View" link={`/contracts/${c.id}`} />
              <TableActionDropdownItem label="Download" onSelect={() => stub('Download')} />
              {c.status === 'pending-signature' && <TableActionDropdownItem label="Sign" displayLabel="Review & Sign" onSelect={() => stub('E-signature')} />}
            </>
          )}
          empty={<EmptyState title="No agreements match" />}
        />
      </Card>
    </>
  );
}
