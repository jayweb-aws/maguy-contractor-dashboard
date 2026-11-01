import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, CheckCircle2, Clock, Users, Wallet, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  EmptyState,
  PageHeader,
  RideStatusBadge,
  SectionCard,
  StatCard,
  formatDate,
  formatDateTime,
} from '@/components/shared';
import { AssignDriverSelect, RejectDialog, RideRowActions } from '@/components/ride-actions';
import { RideDetailsSheet } from '@/components/RideDetailsSheet';
import { useDemo } from '@/demo/store';
import {
  ACTIVE_STATUSES,
  countRides,
  formatMoney,
  formatTime12,
  fullName,
  pendingByDeadline,
  sumPayable,
  upcoming,
  worstCompliance,
} from '@/demo/logic';

export default function Dashboard() {
  const { rides, drivers, documents, notifications, today, driverById, acceptAllPending, rejectAllPending, markRead } =
    useDemo();
  const [rejectAllOpen, setRejectAllOpen] = useState(false);
  const [openRide, setOpenRide] = useState<string | null>(null);

  const counts = useMemo(() => countRides(rides), [rides]);
  const pending = useMemo(() => pendingByDeadline(rides), [rides]);
  const todays = useMemo(
    () =>
      upcoming(rides, today)
        .filter((r) => r.date === today)
        .slice(0, 6),
    [rides, today],
  );
  const needsDriver = rides.filter((r) => r.status === 'accepted').length;
  const todayPayable = sumPayable(
    rides,
    (r) => r.date === today && (ACTIVE_STATUSES.includes(r.status) || r.status === 'accepted' || r.status === 'completed'),
  );
  const periodPayable = sumPayable(rides, (r) => r.status === 'completed');
  const complianceIssues =
    documents.filter((d) => d.state === 'expired' || d.state === 'expiring' || d.state === 'missing').length;
  const recent = notifications.slice(0, 5);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${formatDate(today)} · ${counts.pending} ride${counts.pending === 1 ? '' : 's'} waiting for your response`}
        actions={
          counts.pending > 0 && (
            <>
              <Button variant="outline-reddish" size="boosted" onClick={() => setRejectAllOpen(true)}>
                Reject all pending
              </Button>
              <Button variant="greenish" size="boosted" onClick={acceptAllPending}>
                Accept all pending ({counts.pending})
              </Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard
          label="Pending acceptance"
          value={counts.pending}
          hint="Respond before the deadline"
          icon={<Clock className="h-5 w-5" />}
          tone={counts.pending > 0 ? 'warning' : 'default'}
          to="/rides?tab=pending"
        />
        <StatCard
          label="Accepted · needs driver"
          value={needsDriver}
          hint={`${counts.assigned} assigned · ${counts.inProgress} in progress`}
          icon={<Users className="h-5 w-5" />}
          to="/rides?tab=accepted"
        />
        <StatCard
          label="Completed this period"
          value={counts.completed}
          hint={`${formatMoney(periodPayable)} payable`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="success"
          to="/history"
        />
        <StatCard
          label="Rejected / cancelled"
          value={counts.rejected + counts.cancelled}
          hint={`${counts.rejected} rejected by you`}
          icon={<XCircle className="h-5 w-5" />}
          tone={counts.rejected > 0 ? 'danger' : 'default'}
          to="/rides?tab=rejected"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {/* Pending rides */}
        <SectionCard
          className="xl:col-span-2"
          title={
            <span className="flex items-center gap-2">
              Rides awaiting your response
              {pending.length > 0 && <Badge variant="yellowish">{pending.length}</Badge>}
            </span>
          }
          action={
            <Button variant="link" asChild>
              <Link to="/rides?tab=pending">View all</Link>
            </Button>
          }
          bodyClassName="p-0"
        >
          {pending.length === 0 ? (
            <div className="p-4 lg:p-6">
              <EmptyState title="You're all caught up" body="New rides from Maguy dispatch will appear here." />
            </div>
          ) : (
            <ul className="divide-y divide-[#E6EBF3]">
              {pending.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between lg:px-6">
                  <button className="min-w-0 flex-1 text-left" onClick={() => setOpenRide(r.id)}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-headingBlack">{r.rideNo}</span>
                      <Badge variant="grayish">{r.patient.mobility}</Badge>
                      {r.tripType === 'Round trip' && <Badge variant="bluish">Round trip</Badge>}
                      <span className="text-xs text-primaryGray">
                        {formatDate(r.date)} · {formatTime12(r.pickupTime)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-primaryGray">
                      {r.pickup} → {r.dropoff}
                    </p>
                    <p className="mt-1 text-xs">
                      <span className="font-medium text-brand-green">{formatMoney(r.payableAmount)}</span>
                      <span className="text-primaryGray"> payable · {r.billableMiles.toFixed(1)} mi · </span>
                      <span className="text-[#726D41]">respond by {formatDateTime(r.respondBy)}</span>
                    </p>
                  </button>
                  <RideRowActions ride={r} compact />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Payable / notifications column */}
        <div className="flex flex-col gap-4">
          <SectionCard title="Payable today" bodyClassName="p-4 lg:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-semibold text-headingBlack">{formatMoney(todayPayable)}</p>
                <p className="mt-1 text-xs text-primaryGray">
                  {rides.filter((r) => r.date === today && r.status !== 'rejected' && r.status !== 'cancelled').length}{' '}
                  rides scheduled today · amounts set by Maguy per ride
                </p>
              </div>
              <div className="flex-center h-10 w-10 shrink-0 rounded-full bg-[#DEFFCF] text-[#547544]">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <Button variant="outline" className="mt-4 w-full" asChild>
              <Link to="/pay-periods">Open pay period reports</Link>
            </Button>
          </SectionCard>

          <SectionCard
            title={
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primaryGray" /> Notifications
              </span>
            }
            action={
              <Button variant="link" asChild>
                <Link to="/notifications">View all</Link>
              </Button>
            }
            bodyClassName="p-0"
          >
            <ul className="divide-y divide-[#E6EBF3]">
              {recent.map((n) => (
                <li key={n.id}>
                  <Link
                    to={n.rideId ? `/rides?ride=${n.rideId}` : '/notifications'}
                    onClick={() => markRead(n.id)}
                    className="flex gap-3 px-4 py-3 hover:bg-gray-50"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-primary'}`}
                    />
                    <div className="min-w-0">
                      <p className={`truncate text-sm ${n.read ? 'text-headingBlack' : 'font-semibold text-headingBlack'}`}>
                        {n.title}
                      </p>
                      <p className="truncate text-xs text-primaryGray">{n.body}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {/* Today's schedule */}
        <SectionCard
          className="xl:col-span-2"
          title="Today's schedule"
          action={
            <Button variant="link" asChild>
              <Link to="/rides">Open dispatch board</Link>
            </Button>
          }
          bodyClassName="p-0"
        >
          {todays.length === 0 ? (
            <div className="p-4 lg:p-6">
              <EmptyState title="No rides scheduled today" />
            </div>
          ) : (
            <ul className="divide-y divide-[#E6EBF3]">
              {todays.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:gap-4 lg:px-6">
                  <div className="w-[88px] shrink-0 text-sm font-semibold text-headingBlack">
                    {formatTime12(r.pickupTime)}
                  </div>
                  <button className="min-w-0 flex-1 text-left" onClick={() => setOpenRide(r.id)}>
                    <p className="truncate text-sm text-headingBlack">
                      {r.rideNo} · {r.patient.name} · {r.patient.mobility}
                    </p>
                    <p className="truncate text-xs text-primaryGray">{r.dropoff}</p>
                  </button>
                  <div className="flex items-center gap-3">
                    {r.status === 'accepted' ? (
                      <AssignDriverSelect ride={r} />
                    ) : (
                      <span className="text-xs text-primaryGray">{fullName(driverById(r.driverId))}</span>
                    )}
                    <RideStatusBadge status={r.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Drivers overview */}
        <SectionCard
          title="Driver overview"
          action={
            <Button variant="link" asChild>
              <Link to="/drivers">Manage</Link>
            </Button>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-[#E6EBF3]">
            {drivers.map((d) => {
              const active = rides.filter((r) => r.driverId === d.id && (ACTIVE_STATUSES.includes(r.status)) && r.date === today);
              const worst = worstCompliance(d.compliance);
              return (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-center h-9 w-9 shrink-0 rounded-full bg-primaryHoverMenu text-xs font-semibold text-primary">
                    {d.firstName[0]}
                    {d.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-headingBlack">{fullName(d)}</p>
                    <p className="truncate text-xs text-primaryGray">
                      {d.status === 'active'
                        ? active.length > 0
                          ? `${active.length} ride${active.length === 1 ? '' : 's'} today`
                          : 'Available'
                        : d.status === 'on-leave'
                          ? 'On leave'
                          : 'Inactive'}
                    </p>
                  </div>
                  {worst !== 'valid' && (
                    <AlertTriangle
                      className={`h-4 w-4 ${worst === 'expired' ? 'text-brand-red' : 'text-brand-yellow'}`}
                      aria-label={`Compliance ${worst}`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          {complianceIssues > 0 && (
            <div className="border-t border-[#E6EBF3] p-4">
              <Link to="/documents" className="text-xs font-medium text-primary hover:underline">
                {complianceIssues} compliance item{complianceIssues === 1 ? '' : 's'} need attention →
              </Link>
            </div>
          )}
        </SectionCard>
      </div>

      <RejectDialog
        open={rejectAllOpen}
        onOpenChange={setRejectAllOpen}
        title={`Reject all ${counts.pending} pending rides?`}
        description="The same reason is sent to Maguy dispatch for every ride."
        onConfirm={rejectAllPending}
      />
      <RideDetailsSheet rideId={openRide} onOpenChange={(o) => !o && setOpenRide(null)} />
    </>
  );
}
