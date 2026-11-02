/* My Drivers — Medtransport contractor "employees" table plus Add Driver and a detail drawer. */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComplianceBadge, EmptyState, PageHeader, StatCard, formatDateLong } from '@/components/shared';
import { DataTable, useTableState, type Column } from '@/components/table/DataTable';
import { ActiveFilters, FilterMenu, type FilterDef } from '@/components/table/FilterMenu';
import { BulkActionBar } from '@/components/table/BulkActionBar';
import { TableActionDropdownItem } from '@/components/table/TableActionDropdown';
import { useDemo, type NewDriverInput } from '@/demo/store';
import { ACTIVE_STATUSES, COMPLIANCE_LABEL, fullName, worstCompliance } from '@/demo/logic';
import type { ComplianceState, Driver } from '@/demo/types';

const STATUS_LABEL: Record<Driver['status'], string> = {
  active: 'Active',
  inactive: 'Inactive',
  'on-leave': 'On Leave',
};
const STATUS_VARIANT: Record<Driver['status'], 'greenish' | 'grayish' | 'yellowish'> = {
  active: 'greenish',
  inactive: 'grayish',
  'on-leave': 'yellowish',
};

export default function Drivers() {
  const { drivers, rides, vehicles, vehicleById, today, addDriver, setDriverStatus } = useDemo();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [filters, setFilters] = useState<{ search?: string; status?: string; compliance?: string }>({});
  const table = useTableState(10);

  const active = drivers.filter((d) => d.status === 'active').length;
  const flagged = drivers.filter((d) => worstCompliance(d.compliance) !== 'valid').length;
  const onRoad = useMemo(
    () => new Set(rides.filter((r) => r.date === today && ACTIVE_STATUSES.includes(r.status)).map((r) => r.driverId)).size,
    [rides, today],
  );

  const rows = useMemo(() => {
    const needle = (filters.search ?? '').trim().toLowerCase();
    return drivers.filter((d) => {
      if (filters.status && d.status !== filters.status) return false;
      if (filters.compliance && worstCompliance(d.compliance) !== filters.compliance) return false;
      if (needle && !`${fullName(d)} ${d.employeeId} ${d.phone} ${d.email}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [drivers, filters]);

  const setFilter = (key: string, val: string | undefined) => {
    setFilters((f) => ({ ...f, [key]: val }));
    table.setPage(1);
  };
  const filterDefs: FilterDef[] = [
    { key: 'status', label: 'Status', options: (Object.keys(STATUS_LABEL) as Driver['status'][]).map((s) => ({ value: s, label: STATUS_LABEL[s] })) },
    {
      key: 'compliance',
      label: 'Compliance',
      options: (Object.keys(COMPLIANCE_LABEL) as ComplianceState[]).map((s) => ({ value: s, label: COMPLIANCE_LABEL[s] })),
    },
  ];
  const chips = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([key, value]) => ({
      key,
      label: key === 'status' ? 'Status' : key === 'compliance' ? 'Compliance' : 'Search',
      value:
        key === 'status' ? STATUS_LABEL[value as Driver['status']] : key === 'compliance' ? COMPLIANCE_LABEL[value as ComplianceState] : value!,
    }));

  const columns: Column<Driver>[] = [
    { id: 'employeeId', header: 'Employee ID', className: 'text-primaryGray', cell: (d) => d.employeeId },
    {
      id: 'name',
      header: 'Employee Name',
      cell: (d) => (
        <Link to={`/drivers/${d.id}`} className="font-medium text-primary hover:underline">
          {fullName(d)}
        </Link>
      ),
    },
    { id: 'role', header: 'Role', cell: (d) => d.role },
    { id: 'phone', header: 'Phone', cell: (d) => d.phone },
    {
      id: 'vehicle',
      header: 'Vehicle',
      cell: (d) => {
        const veh = vehicleById(d.vehicleId);
        return veh ? `${veh.plate} · ${veh.type}` : <span className="text-primaryGray">Unassigned</span>;
      },
    },
    { id: 'hire', header: 'Hire Date', cell: (d) => formatDateLong(d.hireDate) },
    { id: 'compliance', header: 'Compliance', cell: (d) => <ComplianceBadge state={worstCompliance(d.compliance)} /> },
    { id: 'status', header: 'Status', cell: (d) => <Badge variant={STATUS_VARIANT[d.status]}>{STATUS_LABEL[d.status]}</Badge> },
    {
      id: 'today',
      header: 'Rides today',
      headClassName: 'text-right',
      className: 'text-right',
      cell: (d) => rides.filter((r) => r.driverId === d.id && r.date === today && r.status !== 'cancelled').length,
    },
  ];

  const bulkStatus = (status: Driver['status']) => {
    table.selected.forEach((id) => setDriverStatus(id, status));
    toast.success(`${table.selected.size} driver${table.selected.size === 1 ? '' : 's'} set to ${STATUS_LABEL[status]}`);
    table.clearSelection();
  };

  return (
    <>
      <PageHeader
        title="My Drivers"
        description="Drivers employed by your company. Only active drivers with valid compliance can be assigned rides."
        actions={
          <Button variant="bluish" size="boosted" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add Driver
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="Total drivers" value={drivers.length} />
        <StatCard label="Active" value={active} tone="success" />
        <StatCard label="On the road now" value={onRoad} />
        <StatCard label="Compliance flags" value={flagged} tone={flagged > 0 ? 'warning' : 'default'} to="/documents" />
      </div>

      <Card className="mt-4 p-0 lg:p-0">
        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <h2 className="card-title text-headingBlack">Drivers</h2>
          <div className="lg:w-[420px]">
            <FilterMenu
              search={filters.search}
              onSearch={(q) => setFilter('search', q || undefined)}
              searchPlaceholder="Search name, ID, phone"
              filters={filterDefs}
              value={filters}
              onChange={setFilter}
            />
          </div>
        </div>
        <ActiveFilters chips={chips} onRemove={(k) => setFilter(k, undefined)} onClearAll={() => setFilters({})} className="border-t border-[#E6EBF3] px-4 py-3 lg:px-6" />
        <BulkActionBar count={table.selected.size} onClear={table.clearSelection}>
          <Button variant="greenish" className="h-8" onClick={() => bulkStatus('active')}>
            Set Active
          </Button>
          <Button variant="outline" className="h-8" onClick={() => bulkStatus('inactive')}>
            Set Inactive
          </Button>
        </BulkActionBar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(d) => d.id}
          table={table}
          onRowClick={(d) => navigate(`/drivers/${d.id}`)}
          actions={(d) => (
            <>
              <TableActionDropdownItem label="View" link={`/drivers/${d.id}`} />
              <TableActionDropdownItem label="Edit" link={`/drivers/${d.id}/edit`} />
              <TableActionDropdownItem label="Documents" displayLabel="Compliance Documents" link="/documents?tab=driver" />
              {d.status === 'active' ? (
                <TableActionDropdownItem label="Cancel" displayLabel="Set Inactive" onSelect={() => setDriverStatus(d.id, 'inactive')} />
              ) : (
                <TableActionDropdownItem label="Approve" displayLabel="Set Active" onSelect={() => setDriverStatus(d.id, 'active')} />
              )}
            </>
          )}
          empty={<EmptyState title="No drivers match" />}
        />
      </Card>

      <AddDriverDialog open={adding} onOpenChange={setAdding} onSave={addDriver} vehicles={vehicles.filter((v) => !drivers.some((d) => d.vehicleId === v.id))} />
    </>
  );
}

function AddDriverDialog({
  open,
  onOpenChange,
  onSave,
  vehicles,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (input: NewDriverInput) => Driver;
  vehicles: { id: string; name: string; plate: string }[];
}) {
  const blank: NewDriverInput = { firstName: '', lastName: '', phone: '', email: '', role: 'Driver', hireDate: '' };
  const [form, setForm] = useState<NewDriverInput>(blank);
  const [touched, setTouched] = useState(false);
  const errors = {
    firstName: form.firstName.trim() ? '' : 'First name is required',
    lastName: form.lastName.trim() ? '' : 'Last name is required',
    phone: /^\(?\d{3}\)?[\s-]?\d{3}-?\d{4}$/.test(form.phone.trim()) ? '' : 'Enter a 10-digit phone number',
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? '' : 'Enter a valid email',
    hireDate: form.hireDate ? '' : 'Hire date is required',
  };
  const valid = Object.values(errors).every((e) => !e);
  const set = (k: keyof NewDriverInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setForm(blank);
          setTouched(false);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Driver</DialogTitle>
          <DialogDescription>
            The driver appears in HR → Employee under your company. Compliance documents must be uploaded before they can be assigned rides.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!valid) return;
            onSave(form);
            onOpenChange(false);
          }}
          noValidate
        >
          <Field label="First name" error={touched ? errors.firstName : ''}>
            <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
          </Field>
          <Field label="Last name" error={touched ? errors.lastName : ''}>
            <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </Field>
          <Field label="Phone" error={touched ? errors.phone : ''}>
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(503) 555-0100" inputMode="tel" />
          </Field>
          <Field label="Email" error={touched ? errors.email : ''}>
            <Input value={form.email} onChange={(e) => set('email', e.target.value)} type="email" />
          </Field>
          <Field label="Role">
            <Select value={form.role} onValueChange={(v) => set('role', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Driver">Driver</SelectItem>
                <SelectItem value="Driver / Dispatcher">Driver / Dispatcher</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Hire date" error={touched ? errors.hireDate : ''}>
            <Input value={form.hireDate} onChange={(e) => set('hireDate', e.target.value)} type="date" />
          </Field>
          <Field label="Vehicle (optional)">
            <Select value={form.vehicleId ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, vehicleId: v || undefined }))}>
              <SelectTrigger>
                <SelectValue placeholder="Assign later" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} · {v.plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="whitish" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="bluish">
              Save driver
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-brand-red">{error}</p>}
    </div>
  );
}
