/* Pay Period Reports — Medtransport "pay-period-reports" columns. */
import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoNote, EmptyState, PageHeader, StatCard, formatDateLong } from '@/components/shared';
import { DataTable, useTableState, type Column } from '@/components/table/DataTable';
import { ActiveFilters, FilterMenu, type FilterDef } from '@/components/table/FilterMenu';
import { BulkActionBar } from '@/components/table/BulkActionBar';
import { TableActionDropdownItem } from '@/components/table/TableActionDropdown';
import { useDemo } from '@/demo/store';
import { formatMoney } from '@/demo/logic';
import type { PayPeriod } from '@/demo/types';

const STATUS: Record<PayPeriod['status'], { label: string; variant: 'bluish' | 'yellowish' | 'greenish' | 'grayish' }> = {
  open: { label: 'Open', variant: 'bluish' },
  submitted: { label: 'Submitted', variant: 'yellowish' },
  approved: { label: 'Approved', variant: 'greenish' },
  paid: { label: 'Paid', variant: 'grayish' },
};

export default function PayPeriods() {
  const { payPeriods } = useDemo();
  const [filters, setFilters] = useState<{ search?: string; status?: string }>({});
  const table = useTableState(10);
  const open = payPeriods.find((p) => p.status === 'open');
  const awaiting = payPeriods.filter((p) => p.status === 'submitted' || p.status === 'approved');
  const paidYtd = payPeriods.filter((p) => p.status === 'paid').reduce((s, p) => s + p.payableAmount, 0);

  const rows = useMemo(() => {
    const needle = (filters.search ?? '').trim().toLowerCase();
    return payPeriods.filter((p) => (!filters.status || p.status === filters.status) && (!needle || p.reportId.toLowerCase().includes(needle)));
  }, [payPeriods, filters]);

  const setFilter = (key: string, val: string | undefined) => {
    setFilters((f) => ({ ...f, [key]: val }));
    table.setPage(1);
  };
  const filterDefs: FilterDef[] = [
    { key: 'status', label: 'Status', options: (Object.keys(STATUS) as PayPeriod['status'][]).map((s) => ({ value: s, label: STATUS[s].label })) },
  ];
  const chips = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([key, value]) => ({
      key,
      label: key === 'status' ? 'Status' : 'Search',
      value: key === 'status' ? STATUS[value as PayPeriod['status']].label : value!,
    }));
  const stub = (what: string) => toast(`${what} is not part of this prototype`);

  const columns: Column<PayPeriod>[] = [
    { id: 'id', header: 'Report ID', className: 'font-medium text-primary', cell: (p) => p.reportId },
    { id: 'start', header: 'Pay Period Start', cell: (p) => formatDateLong(p.start) },
    { id: 'end', header: 'Pay Period End', cell: (p) => formatDateLong(p.end) },
    { id: 'rides', header: 'Rides', headClassName: 'text-right', className: 'text-right', cell: (p) => p.rides },
    {
      id: 'payable',
      header: 'Payable Amount',
      headClassName: 'text-right',
      className: 'text-right font-medium text-headingBlack',
      cell: (p) => formatMoney(p.payableAmount),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (p) => (
        <Badge variant={STATUS[p.status].variant} withDot>
          {STATUS[p.status].label}
        </Badge>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      cell: () => (
        <Button variant="outline" onClick={() => stub('Report download')}>
          <Download className="h-3.5 w-3.5" /> Download
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Pay Period Reports"
        description="Bi-weekly statements of the rides you completed and the amount payable to your company."
      />
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="Current period (open)" value={open ? formatMoney(open.payableAmount) : '—'} hint={open ? `${open.rides} rides so far` : undefined} />
        <StatCard label="Awaiting payment" value={formatMoney(awaiting.reduce((s, p) => s + p.payableAmount, 0))} hint={`${awaiting.length} report${awaiting.length === 1 ? '' : 's'}`} tone="warning" />
        <StatCard label="Paid (last 3 periods)" value={formatMoney(paidYtd)} tone="success" />
        <StatCard label="Avg rides / period" value={Math.round(payPeriods.reduce((s, p) => s + p.rides, 0) / payPeriods.length)} />
      </div>

      <div className="mt-4">
        <DemoNote>
          Figures are sample values. The rate / commission formula behind “Payable Amount” has not been confirmed by Maguy and is not computed here.
        </DemoNote>
      </div>

      <Card className="mt-4 p-0 lg:p-0">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <h2 className="card-title text-headingBlack">Reports</h2>
          <div className="lg:w-[420px]">
            <FilterMenu
              search={filters.search}
              onSearch={(q) => setFilter('search', q || undefined)}
              searchPlaceholder="Search report ID"
              filters={filterDefs}
              value={filters}
              onChange={setFilter}
            />
          </div>
        </div>
        <ActiveFilters chips={chips} onRemove={(k) => setFilter(k, undefined)} onClearAll={() => setFilters({})} className="border-t border-[#E6EBF3] px-4 py-3 lg:px-6" />
        <BulkActionBar count={table.selected.size} onClear={table.clearSelection}>
          <Button variant="outline" className="h-8" onClick={() => stub('Download selected')}>
            <Download className="h-3.5 w-3.5" /> Download {table.selected.size}
          </Button>
        </BulkActionBar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          table={table}
          actions={(p) => (
            <>
              <TableActionDropdownItem label="View" displayLabel="View Report" onSelect={() => stub(`Report ${p.reportId}`)} />
              <TableActionDropdownItem label="Download" displayLabel="Download PDF" onSelect={() => stub('Report download')} />
              <TableActionDropdownItem label="History" displayLabel="Rides in Period" link="/history" />
            </>
          )}
          empty={<EmptyState title="No reports match" />}
        />
      </Card>
    </>
  );
}
