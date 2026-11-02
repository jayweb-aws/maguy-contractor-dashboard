/* My Drivers → driver Edit page (Medtransport employee edit: section sidebar + form). */
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FormColumns, FormNavbar, FormSectionHeader, PageShell, ReadOnlyNote, SectionLayout, SectionNav } from '@/components/pages';
import { ComplianceBadge, formatDateLong } from '@/components/shared';
import { useDemo } from '@/demo/store';
import { fullName } from '@/demo/logic';
import type { Driver } from '@/demo/types';
import { DRIVER_STATUS_LABEL, DRIVER_STATUS_VARIANT } from './DriverView';

type Section = 'personal' | 'contact' | 'work' | 'compliance';
const SECTIONS: { key: Section; label: string }[] = [
  { key: 'personal', label: 'Personal Information' },
  { key: 'contact', label: 'Contact Information' },
  { key: 'work', label: 'Work Information' },
  { key: 'compliance', label: 'Compliance & Training' },
];

export default function DriverEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { drivers, vehicles, updateDriver } = useDemo();
  const driver = drivers.find((d) => d.id === id);
  const [section, setSection] = useState<Section>('personal');
  const [touched, setTouched] = useState(false);
  const [form, setForm] = useState(() => ({
    firstName: driver?.firstName ?? '',
    lastName: driver?.lastName ?? '',
    phone: driver?.phone ?? '',
    email: driver?.email ?? '',
    role: driver?.role ?? ('Driver' as Driver['role']),
    hireDate: driver?.hireDate ?? '',
    status: driver?.status ?? ('active' as Driver['status']),
    vehicleId: driver?.vehicleId ?? '',
  }));
  if (!driver) return <Navigate to="/drivers" replace />;

  const errors = {
    firstName: form.firstName.trim() ? '' : 'First name is required',
    lastName: form.lastName.trim() ? '' : 'Last name is required',
    phone: /^\(?\d{3}\)?[\s-]?\d{3}-?\d{4}$/.test(form.phone.trim()) ? '' : 'Enter a 10-digit phone number',
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? '' : 'Enter a valid email',
    hireDate: form.hireDate ? '' : 'Hire date is required',
  };
  const valid = Object.values(errors).every((e) => !e);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    setTouched(true);
    if (!valid) {
      setSection(errors.firstName || errors.lastName || errors.hireDate ? 'personal' : 'contact');
      return;
    }
    updateDriver(driver.id, {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      role: form.role,
      hireDate: form.hireDate,
      status: form.status,
      vehicleId: form.vehicleId || undefined,
    });
    navigate(`/drivers/${driver.id}`);
  };

  const freeVehicles = vehicles.filter((v) => !drivers.some((d) => d.vehicleId === v.id && d.id !== driver.id));

  return (
    <PageShell
      nav={
        <FormNavbar
          title={
            <span className="flex items-center gap-3">
              Edit {fullName(driver)} <Badge variant={DRIVER_STATUS_VARIANT[driver.status]}>{DRIVER_STATUS_LABEL[driver.status]}</Badge>
            </span>
          }
          subTitle={`${driver.employeeId} · ${driver.role}`}
          backTo={`/drivers/${driver.id}`}
          onSubmit={save}
          onCancel={() => navigate(`/drivers/${driver.id}`)}
        />
      }
    >
      <SectionLayout nav={<SectionNav items={SECTIONS} current={section} onChange={(k) => setSection(k as Section)} />}>
        {section === 'personal' && (
          <>
            <FormSectionHeader title="Personal Information" />
            <FormColumns>
              <Field label="First name" error={touched ? errors.firstName : ''}>
                <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
              </Field>
              <Field label="Last name" error={touched ? errors.lastName : ''}>
                <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
              </Field>
              <Field label="Employee ID" hint="Issued by Maguy HR.">
                <Input value={driver.employeeId} readOnly disabled />
              </Field>
              <Field label="Hire date" error={touched ? errors.hireDate : ''}>
                <Input type="date" value={form.hireDate} onChange={(e) => set('hireDate', e.target.value)} />
              </Field>
            </FormColumns>
          </>
        )}
        {section === 'contact' && (
          <>
            <FormSectionHeader title="Contact Information" />
            <FormColumns>
              <Field label="Phone" error={touched ? errors.phone : ''}>
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" placeholder="(503) 555-0100" />
              </Field>
              <Field label="Email" error={touched ? errors.email : ''}>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </Field>
            </FormColumns>
          </>
        )}
        {section === 'work' && (
          <>
            <FormSectionHeader title="Work Information" subTitle="Inactive and on-leave drivers are hidden from assignment." />
            <FormColumns>
              <Field label="Role">
                <Select value={form.role} onValueChange={(v) => set('role', v as Driver['role'])}>
                  <SelectTrigger aria-label="Role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Driver">Driver</SelectItem>
                    <SelectItem value="Driver / Dispatcher">Driver / Dispatcher</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => set('status', v as Driver['status'])}>
                  <SelectTrigger aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DRIVER_STATUS_LABEL) as Driver['status'][]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {DRIVER_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Vehicle" hint="Only vehicles not assigned to another driver.">
                <Select value={form.vehicleId} onValueChange={(v) => set('vehicleId', v === '__none' ? '' : v)}>
                  <SelectTrigger aria-label="Vehicle">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Unassigned —</SelectItem>
                    {freeVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name} · {v.plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FormColumns>
          </>
        )}
        {section === 'compliance' && (
          <>
            <FormSectionHeader title="Compliance & Training" subTitle="Documents are uploaded under Compliance & Documents; expiry dates come from the document." />
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
            <div className="mt-4">
              <ReadOnlyNote>Upload or replace a certificate from Compliance &amp; Documents → Drivers; the badge updates automatically.</ReadOnlyNote>
            </div>
          </>
        )}
      </SectionLayout>
    </PageShell>
  );
}
