/* Schedules → ride Edit page — Medtransport's edit-ride layout (section sidebar + form) limited to
   what a contractor may change: assignment, trip execution details, ride status and notes.
   Patient / appointment / billing stay read-only — they belong to Maguy dispatch. */
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DataViewer, Field, FormColumns, FormNavbar, FormSectionHeader, PageShell, ReadOnlyNote, SectionLayout, SectionNav } from '@/components/pages';
import { RideStatusBadge, formatDateLong } from '@/components/shared';
import { useDemo } from '@/demo/store';
import {
  RIDE_STATUS_LABEL,
  canAssignDriver,
  canEditRide,
  driverCanBeAssigned,
  formatMoney,
  formatTime12,
  fullName,
  nextStatuses,
  worstCompliance,
  type RideEditable,
} from '@/demo/logic';
import type { RideStatus } from '@/demo/types';

type Section = 'assignment' | 'trip' | 'status' | 'notes';
const SECTIONS: { key: Section; label: string }[] = [
  { key: 'assignment', label: 'Driver & Vehicle' },
  { key: 'trip', label: 'Trip Information' },
  { key: 'status', label: 'Ride Status' },
  { key: 'notes', label: 'Notes to Dispatch' },
];

export default function RideEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { rideById, drivers, vehicles, updateRide, setRideStatus } = useDemo();
  const ride = rideById(id);
  const [section, setSection] = useState<Section>('assignment');
  const [form, setForm] = useState<Partial<RideEditable>>(() =>
    ride
      ? {
          driverId: ride.driverId ?? '',
          vehicleId: ride.vehicleId ?? '',
          needTwoMan: ride.needTwoMan ?? false,
          escortName: ride.escortName ?? '',
          pickupMileage: ride.pickupMileage,
          dropMileage: ride.dropMileage,
          actualPickupTime: ride.actualPickupTime ?? '',
          actualDropoffTime: ride.actualDropoffTime ?? '',
          notes: ride.notes ?? '',
        }
      : {},
  );
  const [nextStatus, setNextStatus] = useState<RideStatus | ''>('');

  if (!ride) return <Navigate to="/schedules" replace />;
  const editable = canEditRide(ride);
  const set = <K extends keyof RideEditable>(k: K, v: RideEditable[K]) => setForm((f) => ({ ...f, [k]: v }));

  const odoError =
    form.pickupMileage !== undefined && form.dropMileage !== undefined && form.dropMileage < form.pickupMileage
      ? 'End miles must be greater than start miles'
      : '';

  const save = () => {
    if (odoError) {
      setSection('trip');
      return;
    }
    const patch: Partial<RideEditable> = {
      ...form,
      driverId: form.driverId || undefined,
      vehicleId: form.vehicleId || undefined,
      escortName: form.escortName || undefined,
      actualPickupTime: form.actualPickupTime || undefined,
      actualDropoffTime: form.actualDropoffTime || undefined,
      notes: form.notes || undefined,
    };
    if (updateRide(ride.id, patch)) navigate(`/schedules/rides/${ride.id}`);
  };

  const allowed = nextStatuses(ride);

  return (
    <PageShell
      nav={
        <FormNavbar
          title={
            <span className="flex items-center gap-3">
              Edit {ride.rideNo} <RideStatusBadge status={ride.status} />
            </span>
          }
          subTitle={`${ride.patient.name} · ${formatDateLong(ride.date)} ${formatTime12(ride.pickupTime)}`}
          backTo={`/schedules/rides/${ride.id}`}
          onSubmit={save}
          onCancel={() => navigate(`/schedules/rides/${ride.id}`)}
          isSubmissionDisabled={!editable || !!odoError}
        />
      }
    >
      <SectionLayout nav={<SectionNav items={SECTIONS} current={section} onChange={(k) => setSection(k as Section)} />}>
        {!editable && (
          <div className="mb-6">
            <ReadOnlyNote>This ride is {RIDE_STATUS_LABEL[ride.status].toLowerCase()} — it can be viewed but not changed.</ReadOnlyNote>
          </div>
        )}

        {section === 'assignment' && (
          <>
            <FormSectionHeader title="Driver & Vehicle" subTitle="Only active drivers with valid compliance can be assigned." />
            <FormColumns>
              <Field label="Driver" hint={canAssignDriver(ride) || ride.driverId ? undefined : 'Accept the ride before assigning a driver.'}>
                <Select
                  value={form.driverId ?? ''}
                  onValueChange={(v) => {
                    const d = drivers.find((x) => x.id === v);
                    setForm((f) => ({ ...f, driverId: v === '__none' ? '' : v, vehicleId: d?.vehicleId ?? f.vehicleId }));
                  }}
                  disabled={!editable || !(canAssignDriver(ride) || ride.driverId)}
                >
                  <SelectTrigger aria-label="Driver">
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— No driver —</SelectItem>
                    {drivers
                      .filter((d) => d.status === 'active')
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id} disabled={!driverCanBeAssigned(d)}>
                          {driverCanBeAssigned(d) ? fullName(d) : `${fullName(d)} — ${worstCompliance(d.compliance)} compliance`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Vehicle">
                <Select value={form.vehicleId ?? ''} onValueChange={(v) => set('vehicleId', v === '__none' ? '' : v)} disabled={!editable || !form.driverId}>
                  <SelectTrigger aria-label="Vehicle">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— No vehicle —</SelectItem>
                    {vehicles
                      .filter((v) => v.status !== 'inactive')
                      .map((v) => (
                        <SelectItem key={v.id} value={v.id} disabled={v.status === 'maintenance'}>
                          {v.name} · {v.plate} · {v.type}
                          {v.status === 'maintenance' ? ' — in maintenance' : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Two-man crew" hint="Required for stretcher and bariatric transports.">
                <div className="flex h-10 items-center gap-3">
                  <Switch checked={!!form.needTwoMan} onCheckedChange={(c) => set('needTwoMan', c)} disabled={!editable} aria-label="Two-man crew" />
                  <span className="text-sm text-primaryGray">{form.needTwoMan ? 'Yes' : 'No'}</span>
                </div>
              </Field>
              <Field label="Escort / attendant name">
                <Input value={form.escortName ?? ''} onChange={(e) => set('escortName', e.target.value)} disabled={!editable} placeholder="Optional" />
              </Field>
            </FormColumns>
            <div className="mt-8">
              <DataViewer
                title="Patient (read-only)"
                record={[
                  { label: 'Client name', value: ride.patient.name },
                  { label: 'Mobility', value: ride.patient.mobility },
                  { label: 'Trip type', value: ride.tripType },
                  { label: 'Special instructions', value: ride.patient.notes ?? '—' },
                ]}
              />
            </div>
          </>
        )}

        {section === 'trip' && (
          <>
            <FormSectionHeader title="Trip Information" subTitle="Odometer readings and the actual times, as recorded by your driver." />
            <FormColumns>
              <Field label="Start miles (ODO at pickup)">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.pickupMileage ?? ''}
                  onChange={(e) => set('pickupMileage', e.target.value === '' ? undefined : Number(e.target.value))}
                  disabled={!editable}
                />
              </Field>
              <Field label="End miles (ODO at drop-off)" error={odoError}>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.dropMileage ?? ''}
                  onChange={(e) => set('dropMileage', e.target.value === '' ? undefined : Number(e.target.value))}
                  disabled={!editable}
                />
              </Field>
              <Field label="Actual pickup time">
                <Input type="time" value={form.actualPickupTime ?? ''} onChange={(e) => set('actualPickupTime', e.target.value)} disabled={!editable} />
              </Field>
              <Field label="Actual drop-off time">
                <Input type="time" value={form.actualDropoffTime ?? ''} onChange={(e) => set('actualDropoffTime', e.target.value)} disabled={!editable} />
              </Field>
            </FormColumns>
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <DataViewer
                title="Appointment (read-only)"
                record={[
                  { label: 'Date', value: formatDateLong(ride.date) },
                  { label: 'Pickup time', value: formatTime12(ride.pickupTime) },
                  { label: 'Appointment time', value: ride.appointmentTime ? formatTime12(ride.appointmentTime) : '—' },
                  { label: 'Pickup address', value: ride.pickup },
                  { label: 'Destination', value: ride.dropoff },
                  { label: 'Billable miles', value: ride.billableMiles.toFixed(1) },
                ]}
              />
              <DataViewer
                title="Billing (read-only)"
                record={[
                  { label: 'Billing account', value: ride.billingAccount },
                  { label: 'Billable amount', value: formatMoney(ride.billableAmount) },
                  { label: 'Payable to you', value: formatMoney(ride.payableAmount) },
                ]}
              />
            </div>
          </>
        )}

        {section === 'status' && (
          <>
            <FormSectionHeader title="Ride Status" subTitle="Record progress on behalf of your driver. Status only moves forward." />
            <div className="mb-6 flex items-center gap-3">
              <span className="text-sm text-primaryGray">Current:</span>
              <RideStatusBadge status={ride.status} />
            </div>
            {allowed.length === 0 ? (
              <ReadOnlyNote>
                {!ride.driverId && canAssignDriver(ride)
                  ? 'Assign a driver first — status updates start once the ride is assigned.'
                  : 'No further status change is available for this ride.'}
              </ReadOnlyNote>
            ) : (
              <FormColumns>
                <Field label="Update status to">
                  <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as RideStatus)}>
                    <SelectTrigger aria-label="Next status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowed.map((s) => (
                        <SelectItem key={s} value={s}>
                          {RIDE_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex items-end">
                  <Button
                    variant="outline-primary"
                    disabled={!nextStatus}
                    onClick={() => {
                      if (nextStatus) setRideStatus(ride.id, nextStatus);
                      setNextStatus('');
                    }}
                  >
                    Update status
                  </Button>
                </div>
              </FormColumns>
            )}
            <div className="mt-8 flex flex-wrap gap-2">
              {(['assigned', 'en-route', 'arrived', 'picked-up', 'completed'] as RideStatus[]).map((s) => (
                <Badge key={s} variant={s === ride.status ? 'bluish' : 'grayish'}>
                  {RIDE_STATUS_LABEL[s]}
                </Badge>
              ))}
            </div>
          </>
        )}

        {section === 'notes' && (
          <>
            <FormSectionHeader title="Notes to Dispatch" subTitle="Visible to Maguy dispatch on the ride record." />
            <Field label="Contractor notes">
              <Textarea rows={6} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} disabled={!editable} placeholder="e.g. Patient needs the side ramp; call on arrival." />
            </Field>
          </>
        )}
      </SectionLayout>
    </PageShell>
  );
}
