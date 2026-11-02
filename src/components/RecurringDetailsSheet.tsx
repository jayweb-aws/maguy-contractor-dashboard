/* Right-hand drawer for a recurring series: recurrence, dates, amounts, default driver and the
   next occurrences (with a link to the ride once Maguy materialises one). */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, MapPin, Phone, Repeat, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { KeyValue, RideStatusBadge, formatDate, formatDateLong, formatDateTime } from '@/components/shared';
import { RejectDialog } from '@/components/ride-actions';
import { useDemo } from '@/demo/store';
import {
  RECURRING_STATUS_LABEL,
  canAcceptRecurring,
  canAssignRecurringDriver,
  canRejectRecurring,
  driverCanBeAssigned,
  expandRecurring,
  formatMoney,
  formatRecurrence,
  formatTime12,
  fullName,
  occurrencesPerWeek,
  recurringBadgeVariant,
  addDays,
  worstCompliance,
} from '@/demo/logic';
import type { RecurringRide } from '@/demo/types';

export function RecurringStatusBadge({ status }: { status: RecurringRide['status'] }) {
  return (
    <Badge variant={recurringBadgeVariant(status)} withDot className="whitespace-nowrap">
      {RECURRING_STATUS_LABEL[status]}
    </Badge>
  );
}

export function RecurringDriverSelect({ series, size = 'default' }: { series: RecurringRide; size?: 'default' | 'boosted' }) {
  const { drivers, assignRecurringDriver } = useDemo();
  if (!canAssignRecurringDriver(series)) return null;
  return (
    <Select
      value={series.driverId ?? ''}
      onValueChange={(v) => assignRecurringDriver(series.id, v === '__unassign' ? null : v)}
    >
      <SelectTrigger
        aria-label={`Default driver for ${series.requestId}`}
        className={size === 'boosted' ? 'h-10 w-full' : 'h-8 w-[180px] text-xs'}
      >
        <SelectValue placeholder="Select driver" />
      </SelectTrigger>
      <SelectContent>
        {drivers
          .filter((d) => d.status === 'active')
          .map((d) => {
            const blocked = !driverCanBeAssigned(d);
            return (
              <SelectItem key={d.id} value={d.id} disabled={blocked}>
                {blocked ? `${fullName(d)} — ${worstCompliance(d.compliance)} compliance` : fullName(d)}
              </SelectItem>
            );
          })}
        {series.driverId && (
          <SelectItem value="__unassign" className="text-brand-red">
            Remove driver
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

export function RecurringDetailsSheet({
  seriesId,
  onOpenChange,
}: {
  seriesId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { recurringById, rides, driverById, vehicleById, today, acceptRecurring, rejectRecurring } = useDemo();
  const [rejecting, setRejecting] = useState(false);
  const series = recurringById(seriesId ?? undefined);
  const driver = driverById(series?.driverId);
  const vehicle = vehicleById(series?.vehicleId);

  const upcoming = useMemo(
    () => (series ? expandRecurring(series, today, addDays(today, 60)).slice(0, 8) : []),
    [series, today],
  );

  return (
    <Sheet open={!!seriesId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {series && (
          <>
            <SheetHeader className="text-left">
              <div className="flex items-center gap-3">
                <SheetTitle className="text-headingBlack">{series.requestId}</SheetTitle>
                <RecurringStatusBadge status={series.status} />
              </div>
              <SheetDescription className="flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5" /> {formatRecurrence(series.days, series.pickupTime)} ·{' '}
                {formatDateLong(series.startDate)} → {formatDateLong(series.endDate)}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-5 text-sm">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-primaryGray">Patient</h3>
                <div className="grid grid-cols-2 gap-3">
                  <KeyValue label="Name" value={series.patient.name} />
                  <KeyValue label="Mobility" value={series.patient.mobility} />
                  <KeyValue
                    label="Phone"
                    value={
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-primaryGray" /> {series.patient.phone}
                      </span>
                    }
                  />
                  <KeyValue label="Trip" value={series.tripType} />
                </div>
                {series.patient.notes && (
                  <p className="rounded-md bg-primaryHoverMenu px-3 py-2 text-xs text-headingBlack">{series.patient.notes}</p>
                )}
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-primaryGray">Route &amp; times</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                    <div>
                      <p className="text-xs text-primaryGray">Pickup (leg A) · {formatTime12(series.pickupTime)}</p>
                      <p className="text-headingBlack">{series.pickup}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" />
                    <div>
                      <p className="text-xs text-primaryGray">
                        Drop-off{series.appointmentTime && ` · appt ${formatTime12(series.appointmentTime)}`}
                      </p>
                      <p className="text-headingBlack">{series.dropoff}</p>
                    </div>
                  </div>
                  {series.returnTime && (
                    <p className="text-xs text-primaryGray">Return leg (B) pickup · {formatTime12(series.returnTime)}</p>
                  )}
                </div>
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-primaryGray">Billing (per occurrence)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <KeyValue label="Billing account" value={series.billingAccount} />
                  <KeyValue label="Funding source" value={series.fundingSource} />
                  <KeyValue label="Billable amount" value={formatMoney(series.billableAmount)} />
                  <KeyValue label="Commission" value={`${series.commissionPct}%`} />
                  <KeyValue label="Pick up charge" value={formatMoney(series.pickUpCharge)} />
                  <KeyValue
                    label="Payable to you"
                    value={<span className="font-semibold text-brand-green">{formatMoney(series.payableAmount)}</span>}
                  />
                  <KeyValue label="Occurrences / week" value={occurrencesPerWeek(series)} />
                  <KeyValue label="Billable miles" value={series.billableMiles.toFixed(1)} />
                </div>
                <p className="text-xs text-primaryGray">Sample figures set by Maguy dispatch; the rate formula is not computed here.</p>
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-primaryGray">Default driver</h3>
                {canAssignRecurringDriver(series) ? (
                  <RecurringDriverSelect series={series} size="boosted" />
                ) : (
                  <KeyValue label="Driver" value={fullName(driver)} />
                )}
                {vehicle && <KeyValue label="Vehicle" value={`${vehicle.name} · ${vehicle.plate} · ${vehicle.type}`} />}
                <p className="text-xs text-primaryGray">
                  Every occurrence is pre-assigned to this driver. You can still change the driver on a single ride from the Schedule.
                </p>
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-primaryGray">Next occurrences</h3>
                {upcoming.length === 0 ? (
                  <p className="text-xs text-primaryGray">
                    {series.status === 'pending' ? 'Accept the series to generate occurrences.' : 'No upcoming occurrences.'}
                  </p>
                ) : (
                  <ul className="divide-y divide-[#E6EBF3] rounded-md border border-[#E6EBF3]">
                    {upcoming.map((o) => {
                      const ride = rides.find((r) => r.recurringId === series.id && r.date === o.date);
                      return (
                        <li key={o.id} className="flex-between gap-3 px-3 py-2">
                          <div>
                            <p className="text-sm text-headingBlack">
                              {formatDate(o.date)} · {formatTime12(o.pickupTime)}
                            </p>
                            <p className="text-xs text-primaryGray">
                              {ride ? (
                                <Link to={`/schedules?ride=${ride.id}`} className="text-primary hover:underline">
                                  {ride.rideNo}
                                </Link>
                              ) : (
                                'Ride not yet created by Maguy'
                              )}
                            </p>
                          </div>
                          {ride ? <RideStatusBadge status={ride.status} /> : <RecurringStatusBadge status={series.status} />}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-primaryGray">Timeline</h3>
                <ul className="space-y-1 text-xs text-primaryGray">
                  <li>Assigned to you by Maguy dispatch · {formatDateTime(series.assignedAt)}</li>
                  {series.status === 'pending' && series.respondBy && <li>Respond by · {formatDateTime(series.respondBy)}</li>}
                  {series.acceptedAt && <li>Accepted · {formatDateTime(series.acceptedAt)}</li>}
                  {series.rejectedAt && (
                    <li className="text-brand-red">
                      Rejected · {formatDateTime(series.rejectedAt)} — {series.rejectReason}
                    </li>
                  )}
                </ul>
              </section>

              {(canAcceptRecurring(series) || canRejectRecurring(series)) && (
                <div className="flex items-center gap-2 pt-2">
                  {canAcceptRecurring(series) && (
                    <Button variant="greenish" size="boosted" onClick={() => acceptRecurring(series.id)}>
                      <Check className="h-4 w-4" /> Accept series
                    </Button>
                  )}
                  {canRejectRecurring(series) && (
                    <Button variant="outline-reddish" size="boosted" onClick={() => setRejecting(true)}>
                      <X className="h-4 w-4" /> Reject series
                    </Button>
                  )}
                </div>
              )}
            </div>
            <RejectDialog
              open={rejecting}
              onOpenChange={setRejecting}
              title={`Reject recurring ride ${series.requestId}?`}
              description={`${series.patient.name} · ${formatRecurrence(series.days, series.pickupTime)}`}
              onConfirm={(reason) => rejectRecurring(series.id, reason)}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
