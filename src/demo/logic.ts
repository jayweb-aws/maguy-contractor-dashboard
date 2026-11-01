/* Pure functions — no React. Everything the UI decides is here so it can be unit-tested. */
import type {
  AppNotification,
  ComplianceItem,
  ComplianceState,
  Driver,
  Ride,
  RideStatus,
} from './types';

/* ---------- labels / badge mapping (mirrors Medtransport StatusBadge groups) ---------- */

export type BadgeVariant =
  | 'greenish'
  | 'bluish'
  | 'yellowish'
  | 'reddish'
  | 'grayish'
  | 'orangy';

export const RIDE_STATUS_LABEL: Record<RideStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  assigned: 'Assigned',
  'en-route': 'En Route',
  'picked-up': 'Picked Up',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export function rideBadgeVariant(status: RideStatus): BadgeVariant {
  switch (status) {
    case 'accepted':
    case 'completed':
      return 'greenish';
    case 'assigned':
      return 'bluish';
    case 'pending':
    case 'en-route':
    case 'picked-up':
      return 'yellowish';
    case 'rejected':
    case 'cancelled':
      return 'reddish';
  }
}

export function complianceBadgeVariant(state: ComplianceState): BadgeVariant {
  switch (state) {
    case 'valid':
      return 'greenish';
    case 'expiring':
      return 'yellowish';
    case 'expired':
      return 'reddish';
    case 'missing':
      return 'grayish';
  }
}

export const COMPLIANCE_LABEL: Record<ComplianceState, string> = {
  valid: 'Valid',
  expiring: 'Expiring Soon',
  expired: 'Expired',
  missing: 'Missing',
};

/* ---------- transitions ---------- */

export const ACTIVE_STATUSES: RideStatus[] = ['assigned', 'en-route', 'picked-up'];
export const OPEN_STATUSES: RideStatus[] = ['pending', 'accepted', ...ACTIVE_STATUSES];

export function canAccept(ride: Ride) {
  return ride.status === 'pending';
}
export function canReject(ride: Ride) {
  // Backend reject-ride only applies while the contractor has not started service;
  // we allow it for pending / accepted / assigned.
  return ride.status === 'pending' || ride.status === 'accepted' || ride.status === 'assigned';
}
export function canAssignDriver(ride: Ride) {
  return ride.status === 'accepted' || ride.status === 'assigned';
}

export function acceptRide(ride: Ride, now: string): Ride {
  if (!canAccept(ride)) return ride;
  return { ...ride, status: 'accepted', acceptedAt: now };
}

export function rejectRide(ride: Ride, reason: string, now: string): Ride {
  const trimmed = reason.trim();
  if (!canReject(ride) || trimmed.length === 0) return ride;
  return {
    ...ride,
    status: 'rejected',
    rejectReason: trimmed,
    rejectedAt: now,
    driverId: undefined,
    vehicleId: undefined,
  };
}

export function assignDriver(ride: Ride, driver: Driver): Ride {
  if (!canAssignDriver(ride)) return ride;
  if (driver.status !== 'active') return ride;
  return { ...ride, status: 'assigned', driverId: driver.id, vehicleId: driver.vehicleId };
}

export function unassignDriver(ride: Ride): Ride {
  if (ride.status !== 'assigned') return ride;
  return { ...ride, status: 'accepted', driverId: undefined, vehicleId: undefined };
}

/* ---------- bulk ---------- */

export function acceptAll(rides: Ride[], now: string): Ride[] {
  return rides.map((r) => (canAccept(r) ? acceptRide(r, now) : r));
}

export function rejectAllPending(rides: Ride[], reason: string, now: string): Ride[] {
  return rides.map((r) => (r.status === 'pending' ? rejectRide(r, reason, now) : r));
}

/* ---------- derived numbers ---------- */

export interface RideCounts {
  pending: number;
  accepted: number;
  assigned: number;
  inProgress: number;
  completed: number;
  rejected: number;
  cancelled: number;
  total: number;
}

export function countRides(rides: Ride[]): RideCounts {
  const c: RideCounts = {
    pending: 0,
    accepted: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
    total: rides.length,
  };
  for (const r of rides) {
    switch (r.status) {
      case 'pending':
        c.pending++;
        break;
      case 'accepted':
        c.accepted++;
        break;
      case 'assigned':
        c.assigned++;
        break;
      case 'en-route':
      case 'picked-up':
        c.inProgress++;
        break;
      case 'completed':
        c.completed++;
        break;
      case 'rejected':
        c.rejected++;
        break;
      case 'cancelled':
        c.cancelled++;
        break;
    }
  }
  return c;
}

/** Sum of payable amounts (cents) for rides matching a predicate. Never invents a figure:
 *  payableAmount is the value Maguy's dispatch sent with the ride. */
export function sumPayable(rides: Ride[], pick: (r: Ride) => boolean) {
  return rides.filter(pick).reduce((s, r) => s + r.payableAmount, 0);
}

export function ridesOn(rides: Ride[], date: string) {
  return rides.filter((r) => r.date === date);
}

export function upcoming(rides: Ride[], today: string) {
  return rides
    .filter((r) => OPEN_STATUSES.includes(r.status) && r.date >= today)
    .sort((a, b) => `${a.date} ${a.pickupTime}`.localeCompare(`${b.date} ${b.pickupTime}`));
}

export function pendingByDeadline(rides: Ride[]) {
  return rides
    .filter((r) => r.status === 'pending')
    .sort((a, b) => a.respondBy.localeCompare(b.respondBy));
}

/** Drivers free on a date for a given pickup time (no overlapping open ride within 90 min). */
export function availableDrivers(drivers: Driver[], rides: Ride[], ride: Ride) {
  const target = toMinutes(ride.pickupTime);
  return drivers.filter((d) => {
    if (d.status !== 'active') return false;
    const busy = rides.some(
      (r) =>
        r.id !== ride.id &&
        r.driverId === d.id &&
        r.date === ride.date &&
        ACTIVE_STATUSES.includes(r.status) &&
        Math.abs(toMinutes(r.pickupTime) - target) < 90,
    );
    return !busy;
  });
}

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/* ---------- compliance ---------- */

export function worstCompliance(items: ComplianceItem[]): ComplianceState {
  const rank: Record<ComplianceState, number> = { valid: 0, expiring: 1, missing: 2, expired: 3 };
  return items.reduce<ComplianceState>(
    (worst, i) => (rank[i.state] > rank[worst] ? i.state : worst),
    'valid',
  );
}

export function driverCanBeAssigned(driver: Driver) {
  return driver.status === 'active' && worstCompliance(driver.compliance) !== 'expired';
}

/* ---------- filters ---------- */

export type RideTab =
  | 'all'
  | 'pending'
  | 'accepted'
  | 'assigned'
  | 'in-progress'
  | 'completed'
  | 'rejected';

export function filterByTab(rides: Ride[], tab: RideTab): Ride[] {
  switch (tab) {
    case 'all':
      return rides;
    case 'in-progress':
      return rides.filter((r) => r.status === 'en-route' || r.status === 'picked-up');
    case 'rejected':
      return rides.filter((r) => r.status === 'rejected' || r.status === 'cancelled');
    default:
      return rides.filter((r) => r.status === tab);
  }
}

export function searchRides(rides: Ride[], q: string, drivers: Driver[]) {
  const needle = q.trim().toLowerCase();
  if (!needle) return rides;
  return rides.filter((r) => {
    const driver = drivers.find((d) => d.id === r.driverId);
    const hay = [
      r.rideNo,
      r.patient.name,
      r.pickup,
      r.dropoff,
      r.billingAccount,
      driver ? `${driver.firstName} ${driver.lastName}` : '',
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(needle);
  });
}

/* ---------- formatting ---------- */

export function formatMoney(cents: number) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}$${dollars.toLocaleString('en-US')}.${rem.toString().padStart(2, '0')}`;
}

export function formatTime12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`;
}

export function fullName(d?: Pick<Driver, 'firstName' | 'lastName'>) {
  return d ? `${d.firstName} ${d.lastName}` : '—';
}

export function unreadCount(items: AppNotification[]) {
  return items.filter((n) => !n.read).length;
}
