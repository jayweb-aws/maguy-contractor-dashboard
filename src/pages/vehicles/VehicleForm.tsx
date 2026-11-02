/* Vehicles → Add / Edit page (Medtransport HR vehicle form, section sidebar + form). */
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Field, FormColumns, FormNavbar, FormSectionHeader, PageShell, SectionLayout, SectionNav } from '@/components/pages';
import { useDemo } from '@/demo/store';
import { fullName } from '@/demo/logic';
import type { Vehicle } from '@/demo/types';
import { VEHICLE_STATUS } from './VehicleView';

type Section = 'vehicle' | 'compliance' | 'driver';
const SECTIONS: { key: Section; label: string }[] = [
  { key: 'vehicle', label: 'Vehicle Information' },
  { key: 'compliance', label: 'Inspection & Insurance' },
  { key: 'driver', label: 'Assigned Driver' },
];
const TYPES: Vehicle['type'][] = ['Sedan', 'Minivan', 'Wheelchair Van', 'Stretcher Van'];

export default function VehicleForm({ mode }: { mode: 'add' | 'edit' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vehicles, drivers, today, addVehicle, updateVehicle } = useDemo();
  const vehicle = mode === 'edit' ? vehicles.find((v) => v.id === id) : undefined;
  const [section, setSection] = useState<Section>('vehicle');
  const [touched, setTouched] = useState(false);
  const [form, setForm] = useState(() => ({
    name: vehicle?.name ?? '',
    plate: vehicle?.plate ?? '',
    vin: vehicle?.vin ?? '',
    type: vehicle?.type ?? ('Minivan' as Vehicle['type']),
    capacity: vehicle?.capacity ?? '',
    ownership: vehicle?.ownership ?? ('Contractor-owned' as Vehicle['ownership']),
    status: vehicle?.status ?? ('active' as Vehicle['status']),
    inspectionDue: vehicle?.inspectionDue ?? '',
    insuranceExpires: vehicle?.insuranceExpires ?? '',
    driverId: vehicle?.driverId ?? '',
    notes: vehicle?.notes ?? '',
  }));
  if (mode === 'edit' && !vehicle) return <Navigate to="/vehicles" replace />;

  const errors = {
    name: form.name.trim() ? '' : 'Year, make and model are required',
    plate: form.plate.trim() ? '' : 'Plate is required',
    capacity: form.capacity.trim() ? '' : 'Capacity is required',
    inspectionDue: form.inspectionDue ? '' : 'Inspection due date is required',
    insuranceExpires: form.insuranceExpires ? '' : 'Insurance expiry is required',
  };
  const valid = Object.values(errors).every((e) => !e);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    setTouched(true);
    if (!valid) {
      setSection(errors.name || errors.plate || errors.capacity ? 'vehicle' : 'compliance');
      return;
    }
    const payload: Omit<Vehicle, 'id'> = {
      name: form.name.trim(),
      plate: form.plate.trim().toUpperCase(),
      vin: form.vin.trim() || undefined,
      type: form.type,
      capacity: form.capacity.trim(),
      ownership: form.ownership,
      status: form.status,
      inspectionDue: form.inspectionDue,
      insuranceExpires: form.insuranceExpires,
      driverId: form.driverId || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (mode === 'edit' && vehicle) {
      updateVehicle(vehicle.id, payload);
      navigate(`/vehicles/${vehicle.id}`);
    } else {
      const created = addVehicle(payload);
      navigate(`/vehicles/${created.id}`);
    }
  };

  const freeDrivers = drivers.filter((d) => !d.vehicleId || d.vehicleId === vehicle?.id);
  const backTo = vehicle ? `/vehicles/${vehicle.id}` : '/vehicles';

  return (
    <PageShell
      nav={
        <FormNavbar
          title={mode === 'edit' ? `Edit ${vehicle?.name}` : 'Add Vehicle'}
          subTitle={mode === 'edit' ? `${vehicle?.plate} · ${vehicle?.type}` : 'A vehicle your drivers will operate on Maguy rides'}
          backTo={backTo}
          onSubmit={save}
          onCancel={() => navigate(backTo)}
          submitText={mode === 'edit' ? 'Save' : 'Add vehicle'}
        />
      }
    >
      <SectionLayout nav={<SectionNav items={SECTIONS} current={section} onChange={(k) => setSection(k as Section)} />}>
        {section === 'vehicle' && (
          <>
            <FormSectionHeader title="Vehicle Information" />
            <FormColumns>
              <Field label="Year, make & model" error={touched ? errors.name : ''}>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="2022 Toyota Sienna" />
              </Field>
              <Field label="Plate" error={touched ? errors.plate : ''}>
                <Input value={form.plate} onChange={(e) => set('plate', e.target.value)} placeholder="ORX 0000" />
              </Field>
              <Field label="VIN">
                <Input value={form.vin} onChange={(e) => set('vin', e.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Vehicle type">
                <Select value={form.type} onValueChange={(v) => set('type', v as Vehicle['type'])}>
                  <SelectTrigger aria-label="Vehicle type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Capacity" error={touched ? errors.capacity : ''}>
                <Input value={form.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="1 WC + 2 ambulatory" />
              </Field>
              <Field label="Ownership" hint="Determines who carries insurance and maintenance.">
                <Select value={form.ownership} onValueChange={(v) => set('ownership', v as Vehicle['ownership'])}>
                  <SelectTrigger aria-label="Ownership">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contractor-owned">Contractor-owned</SelectItem>
                    <SelectItem value="Maguy-owned">Maguy-owned</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => set('status', v as Vehicle['status'])}>
                  <SelectTrigger aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(VEHICLE_STATUS) as Vehicle['status'][]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {VEHICLE_STATUS[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Notes" className="md:col-span-2">
                <Textarea rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" />
              </Field>
            </FormColumns>
          </>
        )}
        {section === 'compliance' && (
          <>
            <FormSectionHeader title="Inspection & Insurance" subTitle="Upload the certificates under Compliance & Documents." />
            <FormColumns>
              <Field label="Inspection due" error={touched ? errors.inspectionDue : ''} hint={form.inspectionDue && form.inspectionDue < today ? 'This date is in the past — the inspection is overdue.' : undefined}>
                <Input type="date" value={form.inspectionDue} onChange={(e) => set('inspectionDue', e.target.value)} />
              </Field>
              <Field label="Insurance expires" error={touched ? errors.insuranceExpires : ''}>
                <Input type="date" value={form.insuranceExpires} onChange={(e) => set('insuranceExpires', e.target.value)} />
              </Field>
            </FormColumns>
          </>
        )}
        {section === 'driver' && (
          <>
            <FormSectionHeader title="Assigned Driver" subTitle="Only drivers without a vehicle are listed." />
            <FormColumns>
              <Field label="Driver">
                <Select value={form.driverId} onValueChange={(v) => set('driverId', v === '__none' ? '' : v)}>
                  <SelectTrigger aria-label="Driver">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Unassigned —</SelectItem>
                    {freeDrivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {fullName(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FormColumns>
          </>
        )}
      </SectionLayout>
    </PageShell>
  );
}
