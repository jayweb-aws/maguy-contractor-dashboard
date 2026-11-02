/* Schedules → recurring series Edit page — the contractor sets the default driver / vehicle and
   standing instructions. The recurrence itself is Maguy's and stays read-only. */
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DataViewer, Field, FormColumns, FormNavbar, FormSectionHeader, PageShell, ReadOnlyNote, SectionLayout, SectionNav } from '@/components/pages';
import { formatDateLong } from '@/components/shared';
import { RecurringStatusBadge } from '@/components/RecurringDetailsSheet';
import { useDemo } from '@/demo/store';
import { canAssignRecurringDriver, driverCanBeAssigned, formatRecurrence, formatTime12, fullName, worstCompliance } from '@/demo/logic';

type Section = 'driver' | 'schedule' | 'notes';
const SECTIONS: { key: Section; label: string }[] = [
  { key: 'driver', label: 'Default Driver' },
  { key: 'schedule', label: 'Recurrence' },
  { key: 'notes', label: 'Standing Instructions' },
];

export default function RecurringEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recurringById, drivers, vehicles, updateRecurring } = useDemo();
  const series = recurringById(id);
  const [section, setSection] = useState<Section>('driver');
  const [form, setForm] = useState(() => ({
    driverId: series?.driverId ?? '',
    vehicleId: series?.vehicleId ?? '',
    notes: series?.notes ?? '',
  }));
  if (!series) return <Navigate to="/schedules/recurring-rides" replace />;
  const editable = canAssignRecurringDriver(series);

  const save = () => {
    updateRecurring(series.id, {
      driverId: form.driverId || undefined,
      vehicleId: form.vehicleId || undefined,
      notes: form.notes || undefined,
    });
    navigate(`/schedules/recurring-rides/${series.id}`);
  };

  return (
    <PageShell
      nav={
        <FormNavbar
          title={
            <span className="flex items-center gap-3">
              Edit {series.requestId} <RecurringStatusBadge status={series.status} />
            </span>
          }
          subTitle={`${series.patient.name} · ${formatRecurrence(series.days, series.pickupTime)}`}
          backTo={`/schedules/recurring-rides/${series.id}`}
          onSubmit={save}
          onCancel={() => navigate(`/schedules/recurring-rides/${series.id}`)}
          isSubmissionDisabled={!editable}
        />
      }
    >
      <SectionLayout nav={<SectionNav items={SECTIONS} current={section} onChange={(k) => setSection(k as Section)} />}>
        {!editable && (
          <div className="mb-6">
            <ReadOnlyNote>Accept the series before setting a default driver.</ReadOnlyNote>
          </div>
        )}
        {section === 'driver' && (
          <>
            <FormSectionHeader title="Default Driver" subTitle="Every occurrence is pre-assigned to this driver; single rides can still be changed on the Schedule." />
            <FormColumns>
              <Field label="Driver">
                <Select
                  value={form.driverId}
                  onValueChange={(v) => {
                    const d = drivers.find((x) => x.id === v);
                    setForm((f) => ({ ...f, driverId: v === '__none' ? '' : v, vehicleId: d?.vehicleId ?? f.vehicleId }));
                  }}
                  disabled={!editable}
                >
                  <SelectTrigger aria-label="Default driver">
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— No default driver —</SelectItem>
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
                <Select value={form.vehicleId} onValueChange={(v) => setForm((f) => ({ ...f, vehicleId: v === '__none' ? '' : v }))} disabled={!editable || !form.driverId}>
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
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
            </FormColumns>
          </>
        )}
        {section === 'schedule' && (
          <>
            <FormSectionHeader title="Recurrence" subTitle="Set by Maguy dispatch — contact dispatch to change days, times or addresses." />
            <FormColumns>
              <Field label="Days & time">
                <Input value={formatRecurrence(series.days, series.pickupTime)} readOnly disabled />
              </Field>
              <Field label="Trip type">
                <Input value={series.tripType} readOnly disabled />
              </Field>
              <Field label="Start date">
                <Input value={formatDateLong(series.startDate)} readOnly disabled />
              </Field>
              <Field label="End date">
                <Input value={formatDateLong(series.endDate)} readOnly disabled />
              </Field>
            </FormColumns>
            <div className="mt-8">
              <DataViewer
                title="Route (read-only)"
                record={[
                  { label: 'Pickup (leg A)', value: `${series.pickup} · ${formatTime12(series.pickupTime)}` },
                  { label: 'Destination', value: series.dropoff },
                  { label: 'Return pickup', value: series.returnTime ? formatTime12(series.returnTime) : '—' },
                ]}
              />
            </div>
          </>
        )}
        {section === 'notes' && (
          <>
            <FormSectionHeader title="Standing Instructions" subTitle="Shown to the driver on every occurrence of this series." />
            <Field label="Instructions">
              <Textarea rows={6} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} disabled={!editable} placeholder="e.g. Use the rear entrance; patient is ready 10 minutes early." />
            </Field>
          </>
        )}
      </SectionLayout>
    </PageShell>
  );
}
