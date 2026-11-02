/* Schedules → ride View page — the contractor's copy of Medtransport's ViewDispatch:
   company / billing header, then Patient, Appointment, Pickup & Destination, Driver & Vehicle,
   Billing, Clarifying information and the timeline. */
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Download, Pencil, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { DataViewer, FormNavbar, PageShell } from '@/components/pages';
import { RideStatusBadge, formatDateLong, formatDateTime } from '@/components/shared';
import { RejectDialog } from '@/components/ride-actions';
import { useDemo } from '@/demo/store';
import { canAccept, canEditRide, canReject, formatMoney, formatTime12, fullName } from '@/demo/logic';

export default function RideView() {
  const { id } = useParams();
  const { rideById, driverById, vehicleById, recurringById, contractor, accept, reject } = useDemo();
  const [rejecting, setRejecting] = useState(false);
  const ride = rideById(id);
  if (!ride) return <Navigate to="/schedules" replace />;
  const driver = driverById(ride.driverId);
  const vehicle = vehicleById(ride.vehicleId);
  const series = recurringById(ride.recurringId);
  const stub = (what: string) => toast(`${what} is not part of this prototype`);

  return (
    <>
      <PageShell
        nav={
          <FormNavbar
            title={
              <span className="flex items-center gap-3">
                {ride.rideNo} <RideStatusBadge status={ride.status} />
              </span>
            }
            subTitle={`${formatDateLong(ride.date)} · Pickup ${formatTime12(ride.pickupTime)}${ride.appointmentTime ? ` · Appt ${formatTime12(ride.appointmentTime)}` : ''}`}
            backTo="/schedules"
            hideButtons
          >
            {canAccept(ride) && (
              <Button variant="greenish" onClick={() => accept(ride.id)}>
                Accept
              </Button>
            )}
            {canReject(ride) && (
              <Button variant="outline-reddish" onClick={() => setRejecting(true)}>
                Reject
              </Button>
            )}
            <Button variant="outline" onClick={() => stub('PDF download')}>
              <Download className="h-4 w-4" /> Download
            </Button>
            {canEditRide(ride) && (
              <Button variant="bluish" asChild>
                <Link to={`/schedules/rides/${ride.id}/edit`}>
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
              title="Contractor"
              record={[
                { label: 'Company', value: contractor.businessName },
                { label: 'Dispatch contact', value: contractor.contactName },
                { label: 'Phone', value: contractor.phone },
                { label: 'Address', value: contractor.address },
              ]}
            />
            <DataViewer
              title="Billing Account"
              record={[
                { label: 'Name', value: ride.billingAccount },
                { label: 'Funding source', value: ride.fundingSource },
                { label: 'Assigned by', value: 'Maguy Medical Transport dispatch' },
                { label: 'Assigned on', value: formatDateTime(ride.assignedAt) },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-10 border-b border-[#E6EBF3] pb-6 lg:grid-cols-2 lg:pb-10">
            <DataViewer
              title="Patient Information"
              record={[
                { label: 'Account Name', value: ride.billingAccount },
                { label: 'Client name', value: ride.patient.name },
                { label: 'Patient Phone', value: ride.patient.phone },
                { label: 'Mobility', value: ride.patient.mobility },
                { label: 'Trip type', value: ride.tripType },
                { label: 'Special instructions', value: ride.patient.notes ?? '—' },
                {
                  label: 'Recurring series',
                  value: series ? (
                    <Link to={`/schedules/recurring-rides/${series.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                      <Repeat className="h-3.5 w-3.5" /> {series.requestId}
                    </Link>
                  ) : (
                    'No'
                  ),
                },
              ]}
            />
            <DataViewer
              title="Appointment Information"
              record={[
                { label: 'Appointment date', value: formatDateLong(ride.date) },
                { label: 'Pickup time', value: formatTime12(ride.pickupTime) },
                { label: 'Appointment time', value: ride.appointmentTime ? formatTime12(ride.appointmentTime) : '—' },
                { label: 'Actual pickup', value: ride.actualPickupTime ? formatTime12(ride.actualPickupTime) : '—' },
                { label: 'Actual drop-off', value: ride.actualDropoffTime ? formatTime12(ride.actualDropoffTime) : '—' },
                { label: 'Respond by', value: ride.status === 'pending' ? formatDateTime(ride.respondBy) : '—' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-10 border-b border-[#E6EBF3] pb-6 lg:grid-cols-2 lg:pb-10">
            <DataViewer
              title="Pickup & Destination"
              record={[
                { label: 'Pickup address', value: ride.pickup },
                { label: 'Destination', value: ride.dropoff },
                { label: 'Billable miles', value: ride.billableMiles.toFixed(1) },
                { label: 'Start miles (ODO)', value: ride.pickupMileage ?? '—' },
                { label: 'End miles (ODO)', value: ride.dropMileage ?? '—' },
              ]}
            />
            <DataViewer
              title="Driver & Vehicle"
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
                { label: 'Driver phone', value: driver?.phone ?? '—' },
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
                { label: 'Vehicle type', value: vehicle?.type ?? '—' },
                { label: 'Two-man crew', value: ride.needTwoMan ? 'Yes' : 'No' },
                { label: 'Escort', value: ride.escortName ?? '—' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-10 border-b border-[#E6EBF3] pb-6 lg:grid-cols-2 lg:pb-10">
            <DataViewer
              title="Billing"
              record={[
                { label: 'Billable amount', value: formatMoney(ride.billableAmount) },
                { label: 'Commission', value: `${ride.commissionPct}%` },
                { label: 'Pick up charge', value: formatMoney(ride.pickUpCharge) },
                { label: 'Payable to you', value: <span className="font-semibold text-brand-green">{formatMoney(ride.payableAmount)}</span> },
                { label: 'Note', value: <span className="text-primaryGray">Sample figures set by Maguy dispatch; the rate formula is not computed here.</span> },
              ]}
            />
            <div className="space-y-6">
              <DataViewer
                title="Timeline"
                record={[
                  { label: 'Assigned', value: formatDateTime(ride.assignedAt) },
                  ...(ride.acceptedAt ? [{ label: 'Accepted', value: formatDateTime(ride.acceptedAt) }] : []),
                  ...(ride.rejectedAt ? [{ label: 'Rejected', value: `${formatDateTime(ride.rejectedAt)} — ${ride.rejectReason}` }] : []),
                  ...(ride.completedAt ? [{ label: 'Completed', value: formatDateTime(ride.completedAt) }] : []),
                ]}
              />
              <DataViewer title="Notes to dispatch" record={[{ label: 'Contractor notes', value: ride.notes || <span className="text-primaryGray">None</span> }]} />
            </div>
          </div>
        </div>
      </PageShell>
      <RejectDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={`Reject ride ${ride.rideNo}?`}
        description={`${ride.patient.name} · ${ride.pickup}`}
        onConfirm={(reason) => reject(ride.id, reason)}
      />
    </>
  );
}
