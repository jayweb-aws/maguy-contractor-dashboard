import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, PageHeader, StatCard, formatDateLong } from '@/components/shared';
import { DataTable, useTableState, type Column } from '@/components/table/DataTable';
import { ActiveFilters, FilterMenu, type FilterDef } from '@/components/table/FilterMenu';
import { BulkActionBar } from '@/components/table/BulkActionBar';
import { TableActionDropdownItem } from '@/components/table/TableActionDropdown';
import { useDemo } from '@/demo/store';
import { fullName } from '@/demo/logic';
import type { Vehicle } from '@/demo/types';

const STATUS: Record<Vehicle['status'], { label: string; variant: 'greenish' | 'yellowish' | 'grayish' }> = {
  active: { label: 'Active', variant: 'greenish' },
  maintenance: { label: 'In Maintenance', variant: 'yellowish' },
  inactive: { label: 'Inactive', variant: 'grayish' },
};

export default function Vehicles() {
  const { vehicles, driverById, today } = useDemo();
  const [filters, setFilters] = useState<{ search?: string; ownership?: string; status?: string; type?: string }>({});
  const table = useTableState(10);
  const overdue = vehicles.filter((v) => v.inspectionDue < today).length;
  const soon = vehicles.filter((v) => v.inspectionDue >= today && daysBetween(today, v.inspectionDue) <= 30).length;

  const rows = useMemo(() => {
    const needle = (filters.search ?? '').trim().toLowerCase();
    return vehicles.filter((v) => {
      if (filters.ownership && v.ownership !== filters.ownership) return false;
      if (filters.status && v.status !== filters.status) return false;
      if (filters.type && v.type !== filters.type) return false;
      if (needle && !`${v.name} ${v.plate} ${v.type} ${fullName(driverById(v.driverId))}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [vehicles, filters, driverById]);

  const setFilter = (key: string, val: string | undefined) => {
    setFilters((f) => ({ ...f, [key]: val }));
    table.setPage(1);
  };
  const filterDefs: FilterDef[] = [
    { key: 'ownership', label: 'Ownership', options: ['Contractor-owned', 'Maguy-owned'].map((o) => ({ value: o, label: o })) },
    { key: 'type', label: 'Vehicle Type', options: [...new Set(vehicles.map((v) => v.type))].map((t) => ({ value: t, label: t })) },
    { key: 'status', label: 'Status', options: (Object.keys(STATUS) as Vehicle['status'][]).map((s) => ({ value: s, label: STATUS[s].label })) },
  ];
  const chips = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([key, value]) => ({
      key,
      label: { search: 'Search', ownership: 'Ownership', status: 'Status', type: 'Vehicle Type' }[key] ?? key,
      value: key === 'status' ? STATUS[value as Vehicle['status']].label : value!,
    }));

  const columns: Column<Vehicle>[] = [
    { id: 'name', header: 'Vehicle', className: 'font-medium text-headingBlack', cell: (v) => v.name },
    { id: 'plate', header: 'Plate', cell: (v) => v.plate },
    { id: 'type', header: 'Type', cell: (v) => v.type },
    { id: 'capacity', header: 'Capacity', className: 'text-primaryGray', cell: (v) => v.capacity },
    {
      id: 'ownership',
      header: 'Ownership',
      cell: (v) => (
        <Badge variant={v.ownership === 'Maguy-owned' ? 'bluish' : 'grayish'} className="whitespace-nowrap">
          {v.ownership}
        </Badge>
      ),
    },
    { id: 'driver', header: 'Driver', cell: (v) => fullName(driverById(v.driverId)) },
    {
      id: 'inspection',
      header: 'Inspection Due',
      cell: (v) => {
        const late = v.inspectionDue < today;
        return (
          <span className={late ? 'font-medium text-brand-red' : ''}>
            {formatDateLong(v.inspectionDue)}
            {late && <span className="block text-[11px]">Overdue</span>}
          </span>
        );
      },
    },
    { id: 'insurance', header: 'Insurance Expires', cell: (v) => formatDateLong(v.insuranceExpires) },
    {
      id: 'status',
      header: 'Status',
      cell: (v) => (
        <Badge variant={STATUS[v.status].variant} withDot>
          {STATUS[v.status].label}
        </Badge>
      ),
    },
  ];

  const stub = (what: string) => toast(`${what} is not part of this prototype`);

  return (
    <>
      <PageHeader
        title="Vehicles"
        description="Vehicles your drivers operate. Ownership determines who carries insurance and maintenance."
        actions={
          <Button variant="bluish" size="boosted" onClick={() => stub('Add vehicle')}>
            Add Vehicle
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="Fleet size" value={vehicles.length} />
        <StatCard label="Contractor-owned" value={vehicles.filter((v) => v.ownership === 'Contractor-owned').length} />
        <StatCard label="Inspection due ≤ 30 days" value={soon} tone={soon > 0 ? 'warning' : 'default'} />
        <StatCard label="Inspection overdue" value={overdue} tone={overdue > 0 ? 'danger' : 'default'} />
      </div>

      <Card className="mt-4 p-0 lg:p-0">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <h2 className="card-title text-headingBlack">Fleet</h2>
          <div className="lg:w-[420px]">
            <FilterMenu
              search={filters.search}
              onSearch={(q) => setFilter('search', q || undefined)}
              searchPlaceholder="Search vehicle, plate, driver"
              filters={filterDefs}
              value={filters}
              onChange={setFilter}
            />
          </div>
        </div>
        <ActiveFilters chips={chips} onRemove={(k) => setFilter(k, undefined)} onClearAll={() => setFilters({})} className="border-t border-[#E6EBF3] px-4 py-3 lg:px-6" />
        <BulkActionBar count={table.selected.size} onClear={table.clearSelection}>
          <Button variant="outline" className="h-8" onClick={() => stub('Schedule inspection')}>
            Schedule inspection
          </Button>
          <Button variant="outline" className="h-8" onClick={() => stub('Export selected')}>
            Export {table.selected.size}
          </Button>
        </BulkActionBar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(v) => v.id}
          table={table}
          actions={(v) => (
            <>
              <TableActionDropdownItem label="View" onSelect={() => stub(`Vehicle ${v.plate} details`)} />
              <TableActionDropdownItem label="Edit" onSelect={() => stub('Edit vehicle')} />
              <TableActionDropdownItem label="Documents" displayLabel="Inspection & Insurance" link="/documents?tab=company" />
            </>
          )}
          empty={<EmptyState title="No vehicles match" />}
        />
      </Card>
    </>
  );
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}
