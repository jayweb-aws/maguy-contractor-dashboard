/* Schedules → recurring series View page (Medtransport view-recurring-ride). */
import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Download, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { DataViewer, FormNavbar, PageShell } from '@/components/pages';
import { RideStatusBadge, formatDate, formatDateLong, formatDateTime } from '@/components/shared';
import { RejectDialog } from '@/components/ride-actions';
import { RecurringStatusBadge } from '@/components/RecurringDetailsSheet';
import { useDemo } from '@/demo/store';
import {
  addDays,
  canAcceptRecurring,
  canRejectRecurring,
  expandRecurring,
  formatMoney,
  formatRecurrence,
  formatTime12,
  fullName,
  occurrencesPerWeek,
} from '@/demo/logic';

export default function RecurringView() {
  const { id } = useParams();
  const { recurringById, rides, driverById, vehicleById, today, acceptRecurring, rejectRecurring } = useDemo();
  const [rejecting, setRejecting] = useState(false);
  const series = recurringById(id);
  const upcoming = useMemo(() => (series ? expandRecurring(series, today, addDays(today, 90)).slice(0, 12) : []), [series, today]);
  if (!series) return <Navigate to="/schedules/recurring-rides" replace />;
  const driver = driverById(series.driverId);
  const vehicle = vehicleById(series.vehicleId);
  const linked = rides.filter((r) => r.recurringId === series.id);
  const stub = (what: string) => toast(`${what} is not part of this prototype`);

  return (
    <>
      <PageShell
        nav={
          <FormNavbar
            title={
              <span className="flex items-center gap-3">
                {series.requestId} <RecurringStatusBadge status={series.status} />
              </span>
            }
            subTitle={`${series.patient.name} · ${formatRecurrence(series.days, series.pickupTime)}`}
            backTo="/schedules/recurring-rides"
            hideButtons
          >
            {canAcceptRecurring(series) && (
              <Button variant="greenish" onClick={() => acceptRecurring(series.id)}>
                Accept series
              </Button>
            )}
            {canRejectRecurring(series) && (
              <Button variant="outline-reddish" onClick={() => setRejecting(true)}>
                {series.status === 'active' ? 'Stop series' : 'Reject'}
              </Button>
            )}
            <Button variant="outline" onClick={() => stub('PDF download')}>
              <Download className="h-4 w-4" /> Download
            </Button>
            {(series.status === 'active' || series.status === 'paused') && (
              <Button variant="bluish" asChild>
                <Link to={`/schedules/recurring-rides/${series.id}/edit`}>
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
              </Button>
            )}
          </FormNavbar>
        }
      >
        <div className="mx-auto max-w-[1400px] space-y-10 px-4 py-6 lg:px-6 lg:py-8">
          <img src={logo} alt="Maguy Medical Transport" className="w-[120px]" />

          <div className="grid grid-cols-1 gap-10 border-b border-[#E6EBF3] pb-6 lg:grid-cols-2 lg:pb-10">
            <DataViewer
              title="Recurring Ride"
              record={[
                { label: 'Request ID', value: series.requestId },
                { label: 'Recurrence', value: formatRecurrence(series.days, series.pickupTime) },
                { label: 'Start date', value: formatDateLong(series.startDate) },
                { label: 'End date', value: formatDateLong(series.endDate) },
                { label: 'Trip type', value: series.tripType },
                { label: 'Rides per week', value: occurrencesPerWeek(series) },
                { label: 'Status', value: <RecurringStatusBadge status={series.status} /> },
              ]}
            />
            <DataViewer
              title="Patient Information"
              record={[
                { label: 'Client name', value: series.patient.name },
                { label: 'Patient phone', value: series.patient.phone },
                { label: 'Mobility', value: series.patient.mobility },
                { label: 'Special instructions', value: series.patient.notes ?? '—' },
                { label: 'Billing account', value: series.billingAccount },
                { label: 'Funding source', value: series.fundingSource },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-10 border-b border-[#E6EBF3] pb-6 lg:grid-cols-2 lg:pb-10">
            <DataViewer
              title="Pickup & Destination"
              record={[
                { label: 'Pickup (leg A)', value: series.pickup },
                { label: 'Pickup time', value: formatTime12(series.pickupTime) },
                { label: 'Destination', value: series.dropoff },
                { label: 'Appointment time', value: series.appointmentTime ? formatTime12(series.appointmentTime) : '—' },
                { label: 'Return pickup (leg B)', value: series.returnTime ? formatTime12(series.returnTime) : '—' },
                { label: 'Billable miles', value: series.billableMiles.toFixed(1) },
              ]}
            />
            <DataViewer
              title="Default Driver & Vehicle"
              record={[
                {
                  label: 'Driver',
                  value: driver ? (
                    <Link to={`/drivers/${driver.id}`} className="text-primary hover:underline">
                      {fullName(driver)}
                    </Link>
                  ) : (
                    <span className="text-primaryGray">Not assigned</span>
                  ),
                },
                {
                  label: 'Vehicle',
                  value: vehicle ? (
                    <Link to={`/vehicles/${vehicle.id}`} className="text-primary hover:underline">
                      {vehicle.name} · {vehicle.plate}
                    </Link>
                  ) : (
                    '—'
                  ),
                },
                { label: 'Standing instructions', value: series.notes || <span className="text-primaryGray">None</span> },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-10 border-b border-[#E6EBF3] pb-6 lg:grid-cols-2 lg:pb-10">
            <DataViewer
              title="Billing (per occurrence)"
              record={[
                { label: 'Billable amount', value: formatMoney(series.billableAmount) },
                { label: 'Commission', value: `${series.commissionPct}%` },
                { label: 'Pick up charge', value: formatMoney(series.pickUpCharge) },
                { label: 'Payable to you', value: <span className="font-semibold text-brand-green">{formatMoney(series.payableAmount)}</span> },
                { label: 'Payable per week', value: formatMoney(series.payableAmount * occurrencesPerWeek(series)) },
                { label: 'Note', value: <span className="text-primaryGray">Sample figures set by Maguy dispatch.</span> },
              ]}
            />
            <DataViewer
              title="Timeline"
              record={[
                { label: 'Assigned', value: formatDateTime(series.assignedAt) },
                ...(series.respondBy && series.status === 'pending' ? [{ label: 'Respond by', value: formatDateTime(series.respondBy) }] : []),
                ...(series.acceptedAt ? [{ label: 'Accepted', value: formatDateTime(series.acceptedAt) }] : []),
                ...(series.rejectedAt ? [{ label: 'Rejected', value: `${formatDateTime(series.rejectedAt)} — ${series.rejectReason}` }] : []),
                { label: 'Rides created so far', value: linked.length },
              ]}
            />
          </div>

          <div>
            <h6 className="mb-3 text-base font-medium text-headingBlack md:text-lg">Upcoming occurrences</h6>
            {upcoming.length === 0 ? (
              <p className="text-sm text-primaryGray">
                {series.status === 'pending' ? 'Accept the series to generate occurrences.' : 'No upcoming occurrences.'}
              </p>
            ) : (
              <ul className="divide-y divide-[#E6EBF3] rounded-md border border-[#E6EBF3]">
                {upcoming.map((o) => {
                  const ride = linked.find((r) => r.date === o.date);
                  return (
                    <li key={o.id} className="flex-between gap-3 px-4 py-2.5 text-sm">
                      <span className="text-headingBlack">
                        {formatDate(o.date)} · {formatTime12(o.pickupTime)}
                      </span>
                      {ride ? (
                        <span className="flex items-center gap-3">
                          <Link to={`/schedules/rides/${ride.id}`} className="text-primary hover:underline">
                            {ride.rideNo}
                          </Link>
                          <RideStatusBadge status={ride.status} />
                        </span>
                      ) : (
                        <span className="text-xs text-primaryGray">Ride not yet created by Maguy</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </PageShell>
      <RejectDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={`${series.status === 'active' ? 'Stop' : 'Reject'} recurring ride ${series.requestId}?`}
        description={`${series.patient.name} · ${formatRecurrence(series.days, series.pickupTime)}`}
        onConfirm={(reason) => rejectRecurring(series.id, reason)}
      />
    </>
  );
}
