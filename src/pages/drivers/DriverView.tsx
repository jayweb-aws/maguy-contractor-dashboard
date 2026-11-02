/* My Drivers → driver View page (Medtransport employee view: personal / contact / work info,
   documents, plus the contractor's own ride lists). */
import { Link, Navigate, useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataViewer, FormNavbar, PageShell } from '@/components/pages';
import { ComplianceBadge, RideStatusBadge, formatDate, formatDateLong } from '@/components/shared';
import { useDemo } from '@/demo/store';
import { ACTIVE_STATUSES, formatMoney, formatTime12, fullName, worstCompliance } from '@/demo/logic';
import type { Driver } from '@/demo/types';

export const DRIVER_STATUS_LABEL: Record<Driver['status'], string> = { active: 'Active', inactive: 'Inactive', 'on-leave': 'On Leave' };
export const DRIVER_STATUS_VARIANT: Record<Driver['status'], 'greenish' | 'grayish' | 'yellowish'> = {
  active: 'greenish',
  inactive: 'grayish',
  'on-leave': 'yellowish',
};

export default function DriverView() {
  const { id } = useParams();
  const { drivers, rides, vehicleById, today, setDriverStatus } = useDemo();
  const driver = drivers.find((d) => d.id === id);
  if (!driver) return <Navigate to="/drivers" replace />;
  const vehicle = vehicleById(driver.vehicleId);
  const mine = rides.filter((r) => r.driverId === driver.id);
  const upcoming = mine
    .filter((r) => r.date >= today && (r.status === 'assigned' || ACTIVE_STATUSES.includes(r.status)))
    .sort((a, b) => `${a.date} ${a.pickupTime}`.localeCompare(`${b.date} ${b.pickupTime}`));
  const completed = mine.filter((r) => r.status === 'completed');
  const worst = worstCompliance(driver.compliance);

  return (
    <PageShell
      nav={
        <FormNavbar
          title={
            <span className="flex items-center gap-3">
              {fullName(driver)} <Badge variant={DRIVER_STATUS_VARIANT[driver.status]}>{DRIVER_STATUS_LABEL[driver.status]}</Badge>
            </span>
          }
          subTitle={`${driver.employeeId} · ${driver.role} · hired ${formatDateLong(driver.hireDate)}`}
          backTo="/drivers"
          hideButtons
        >
          {driver.status === 'active' ? (
            <Button variant="outline" onClick={() => setDriverStatus(driver.id, 'inactive')}>
              Set Inactive
            </Button>
          ) : (
            <Button variant="outline-greenish" onClick={() => setDriverStatus(driver.id, 'active')}>
              Set Active
            </Button>
          )}
          <Button variant="bluish" asChild>
            <Link to={`/drivers/${driver.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
        </FormNavbar>
      }
    >
      <div className="mx-auto max-w-[1400px] space-y-10 px-4 py-6 lg:px-6 lg:py-8">
        <div className="grid grid-cols-1 gap-10 border-b border-[#E6EBF3] pb-6 lg:grid-cols-2 lg:pb-10">
          <DataViewer
            title="Personal Information"
            record={[
              { label: 'Employee ID', value: driver.employeeId },
              { label: 'First name', value: driver.firstName },
              { label: 'Last name', value: driver.lastName },
              { label: 'Role', value: driver.role },
              { label: 'Hire date', value: formatDateLong(driver.hireDate) },
              { label: 'Employee type', value: 'Independent Contractor staff' },
            ]}
          />
          <DataViewer
            title="Contact Information"
            record={[
              { label: 'Phone', value: driver.phone },
              { label: 'Email', value: <span className="break-all">{driver.email}</span> },
              { label: 'Employer', value: 'Northside Mobility Partners LLC' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 gap-10 border-b border-[#E6EBF3] pb-6 lg:grid-cols-2 lg:pb-10">
          <DataViewer
            title="Work Information"
            record={[
              { label: 'Status', value: <Badge variant={DRIVER_STATUS_VARIANT[driver.status]}>{DRIVER_STATUS_LABEL[driver.status]}</Badge> },
              {
                label: 'Vehicle',
                value: vehicle ? (
                  <Link to={`/vehicles/${vehicle.id}`} className="text-primary hover:underline">
                    {vehicle.name} · {vehicle.plate}
                  </Link>
                ) : (
                  <span className="text-primaryGray">Unassigned</span>
                ),
              },
              { label: 'Can be assigned', value: driver.status === 'active' && worst !== 'expired' ? 'Yes' : `No — ${driver.status !== 'active' ? DRIVER_STATUS_LABEL[driver.status].toLowerCase() : 'expired compliance'}` },
              { label: 'Rides completed', value: completed.length },
              { label: 'Payable earned (completed)', value: formatMoney(completed.reduce((s, r) => s + r.payableAmount, 0)) },
            ]}
          />
          <div className="space-y-3">
            <h6 className="text-base font-medium text-headingBlack md:text-lg">Compliance &amp; Training</h6>
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
            <Link to="/documents?tab=driver" className="text-xs text-primary hover:underline">
              Manage documents →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="space-y-3">
            <h6 className="text-base font-medium text-headingBlack md:text-lg">Upcoming rides ({upcoming.length})</h6>
            {upcoming.length === 0 ? (
              <p className="text-sm text-primaryGray">No upcoming rides assigned.</p>
            ) : (
              <ul className="divide-y divide-[#E6EBF3] rounded-md border border-[#E6EBF3]">
                {upcoming.map((r) => (
                  <li key={r.id} className="flex-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <Link to={`/schedules/rides/${r.id}`} className="text-sm text-primary hover:underline">
                        {r.rideNo}
                      </Link>
                      <span className="ml-2 text-sm text-headingBlack">
                        {formatDate(r.date)} {formatTime12(r.pickupTime)}
                      </span>
                      <p className="truncate text-xs text-primaryGray">{r.dropoff}</p>
                    </div>
                    <RideStatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-3">
            <h6 className="text-base font-medium text-headingBlack md:text-lg">Recent completed rides</h6>
            {completed.length === 0 ? (
              <p className="text-sm text-primaryGray">None yet.</p>
            ) : (
              <ul className="divide-y divide-[#E6EBF3] rounded-md border border-[#E6EBF3]">
                {completed
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 6)
                  .map((r) => (
                    <li key={r.id} className="flex-between gap-3 px-3 py-2 text-sm">
                      <span>
                        <Link to={`/schedules/rides/${r.id}`} className="text-primary hover:underline">
                          {r.rideNo}
                        </Link>
                        <span className="ml-2 text-headingBlack">{formatDate(r.date)}</span>
                        <span className="ml-2 text-primaryGray">{r.patient.name}</span>
                      </span>
                      <span className="font-medium text-brand-green">{formatMoney(r.payableAmount)}</span>
                    </li>
                  ))}
              </ul>
            )}
            <Link to={`/history?driver=${driver.id}`} className="text-xs text-primary hover:underline">
              Full ride history →
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
