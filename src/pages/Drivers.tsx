/* My Drivers — Medtransport contractor "employees" table plus Add Driver and a detail drawer. */
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ComplianceBadge,
  KeyValue,
  PageHeader,
  RideStatusBadge,
  StatCard,
  formatDate,
  formatDateLong,
} from '@/components/shared';
import { useDemo, type NewDriverInput } from '@/demo/store';
import { ACTIVE_STATUSES, formatTime12, fullName, worstCompliance } from '@/demo/logic';
import type { Driver } from '@/demo/types';

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
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const driver = drivers.find((d) => d.id === selected);

  const active = drivers.filter((d) => d.status === 'active').length;
  const flagged = drivers.filter((d) => worstCompliance(d.compliance) !== 'valid').length;
  const onRoad = useMemo(
    () => new Set(rides.filter((r) => r.date === today && ACTIVE_STATUSES.includes(r.status)).map((r) => r.driverId)).size,
    [rides, today],
  );

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Employee ID</TableHead>
              <TableHead className="whitespace-nowrap">Employee Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead className="whitespace-nowrap">Hire Date</TableHead>
              <TableHead>Compliance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Rides today</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drivers.map((d) => {
              const veh = vehicleById(d.vehicleId);
              const todays = rides.filter((r) => r.driverId === d.id && r.date === today && r.status !== 'cancelled').length;
              return (
                <TableRow key={d.id} className="cursor-pointer text-xs md:text-sm" onClick={() => setSelected(d.id)}>
                  <TableCell className="whitespace-nowrap text-primaryGray">{d.employeeId}</TableCell>
                  <TableCell className="whitespace-nowrap font-medium text-primary">{fullName(d)}</TableCell>
                  <TableCell className="whitespace-nowrap">{d.role}</TableCell>
                  <TableCell className="whitespace-nowrap">{d.phone}</TableCell>
                  <TableCell className="whitespace-nowrap">{veh ? `${veh.plate} · ${veh.type}` : <span className="text-primaryGray">Unassigned</span>}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateLong(d.hireDate)}</TableCell>
                  <TableCell>
                    <ComplianceBadge state={worstCompliance(d.compliance)} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{todays}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <AddDriverDialog open={adding} onOpenChange={setAdding} onSave={addDriver} vehicles={vehicles.filter((v) => !drivers.some((d) => d.vehicleId === v.id))} />

      <Sheet open={!!driver} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {driver && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-center gap-3">
                  <SheetTitle>{fullName(driver)}</SheetTitle>
                  <Badge variant={STATUS_VARIANT[driver.status]}>{STATUS_LABEL[driver.status]}</Badge>
                </div>
                <SheetDescription>
                  {driver.employeeId} · {driver.role} · hired {formatDateLong(driver.hireDate)}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-5 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <KeyValue label="Phone" value={driver.phone} />
                  <KeyValue label="Email" value={<span className="break-all">{driver.email}</span>} />
                  <KeyValue
                    label="Vehicle"
                    value={vehicleById(driver.vehicleId)?.name ?? <span className="text-primaryGray">Unassigned</span>}
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-primaryGray">Active for dispatch</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={driver.status === 'active'}
                        onCheckedChange={(c) => setDriverStatus(driver.id, c ? 'active' : 'inactive')}
                        aria-label="Toggle active"
                      />
                      <span className="text-xs text-primaryGray">{driver.status === 'active' ? 'Can be assigned' : 'Hidden from assignment'}</span>
                    </div>
                  </div>
                </div>

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primaryGray">Compliance &amp; training</h3>
                  <ul className="divide-y divide-[#E6EBF3] rounded-md border border-[#E6EBF3]">
                    {driver.compliance.map((c) => (
                      <li key={c.key} className="flex-between gap-3 px-3 py-2">
                        <div>
                          <p className="text-sm text-headingBlack">{c.label}</p>
                          <p className="text-xs text-primaryGray">{c.expires ? `Expires ${formatDateLong(c.expires)}` : 'No document on file'}</p>
                        </div>
                        <ComplianceBadge state={c.state} />
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primaryGray">Upcoming rides</h3>
                  {rides.filter((r) => r.driverId === driver.id && r.date >= today && !['completed', 'rejected', 'cancelled'].includes(r.status)).length === 0 ? (
                    <p className="text-xs text-primaryGray">No upcoming rides assigned.</p>
                  ) : (
                    <ul className="space-y-2">
                      {rides
                        .filter((r) => r.driverId === driver.id && r.date >= today && !['completed', 'rejected', 'cancelled'].includes(r.status))
                        .sort((a, b) => `${a.date} ${a.pickupTime}`.localeCompare(`${b.date} ${b.pickupTime}`))
                        .map((r) => (
                          <li key={r.id} className="flex-between gap-3 rounded-md border border-[#E6EBF3] px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-sm text-headingBlack">
                                {r.rideNo} · {formatDate(r.date)} {formatTime12(r.pickupTime)}
                              </p>
                              <p className="truncate text-xs text-primaryGray">{r.dropoff}</p>
                            </div>
                            <RideStatusBadge status={r.status} />
                          </li>
                        ))}
                    </ul>
                  )}
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
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
