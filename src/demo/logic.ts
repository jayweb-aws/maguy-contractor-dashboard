/* Pure functions — no React. Everything the UI decides is here so it can be unit-tested. */
import type {
  AppNotification,
  ComplianceItem,
  ComplianceState,
  Driver,
  RecurringOccurrence,
  RecurringRide,
  RecurringStatus,
  Ride,
  RideStatus,
  Vehicle,
  Weekday,
} from './types';

/* ---------- labels / badge mapping (mirrors Medtransport StatusBadge groups) ---------- */

export type BadgeVariant =
  | 'greenish'
  | 'bluish'
  | 'yellowish'
  | 'reddish'
  | 'grayish'
  | 'orangy'
  | 'purplish';

export const RIDE_STATUS_LABEL: Record<RideStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  assigned: 'Assigned',
  'en-route': 'En Route',
  arrived: 'Arrived',
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
    case 'arrived':
      return 'bluish';
    case 'pending':
      return 'yellowish';
    case 'en-route':
      return 'purplish';
    case 'picked-up':
      return 'orangy';
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

export const ACTIVE_STATUSES: RideStatus[] = ['assigned', 'en-route', 'arrived', 'picked-up'];
/** Statuses where the driver has started service — the ride is "in progress". */
export const IN_PROGRESS_STATUSES: RideStatus[] = ['en-route', 'arrived', 'picked-up'];
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

/** Forward-only progress a contractor dispatcher may record on behalf of the driver
 *  (Medtransport's dispatch status select, restricted to the ride's own lifecycle). */
export const PROGRESS_ORDER: RideStatus[] = ['assigned', 'en-route', 'arrived', 'picked-up', 'completed'];

export function nextStatuses(ride: Ride): RideStatus[] {
  const i = PROGRESS_ORDER.indexOf(ride.status);
  if (i < 0) return [];
  if (!ride.driverId) return [];
  return PROGRESS_ORDER.slice(i + 1);
}

export function canSetStatus(ride: Ride, status: RideStatus) {
  return nextStatuses(ride).includes(status);
}

export function setRideStatus(ride: Ride, status: RideStatus, nowHHMM: string, nowIso: string): Ride {
  if (!canSetStatus(ride, status)) return ride;
  const next: Ride = { ...ride, status };
  if (status === 'picked-up' && !next.actualPickupTime) next.actualPickupTime = nowHHMM;
  if (status === 'completed') {
    if (!next.actualPickupTime) next.actualPickupTime = nowHHMM;
    if (!next.actualDropoffTime) next.actualDropoffTime = nowHHMM;
    next.completedAt = nowIso;
  }
  return next;
}

/** Fields the contractor may change on a ride; everything else belongs to Maguy dispatch. */
export type RideEditable = Pick<
  Ride,
  'driverId' | 'vehicleId' | 'pickupMileage' | 'dropMileage' | 'actualPickupTime' | 'actualDropoffTime' | 'needTwoMan' | 'escortName' | 'notes'
>;

export function canEditRide(ride: Ride) {
  return ride.status !== 'rejected' && ride.status !== 'cancelled';
}

export function applyRideEdit(ride: Ride, patch: Partial<RideEditable>, drivers: Driver[]): Ride {
  if (!canEditRide(ride)) return ride;
  let next: Ride = { ...ride };
  const { driverId, vehicleId, ...rest } = patch;
  Object.assign(next, rest);
  if (driverId !== undefined && driverId !== ride.driverId) {
    if (!driverId) {
      next = unassignDriver(next);
    } else {
      const d = drivers.find((x) => x.id === driverId);
      if (d && driverCanBeAssigned(d) && canAssignDriver(next)) next = assignDriver(next, d);
    }
  }
  if (vehicleId !== undefined && next.driverId) next.vehicleId = vehicleId || undefined;
  if (next.pickupMileage !== undefined && next.dropMileage !== undefined && next.dropMileage < next.pickupMileage) {
    next.dropMileage = ride.dropMileage; // refuse an odometer that runs backwards
  }
  return next;
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
      case 'arrived':
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
      return rides.filter((r) => IN_PROGRESS_STATUSES.includes(r.status));
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

/* ---------- bulk (checkbox selection) ---------- */

export function acceptMany(rides: Ride[], ids: Iterable<string>, now: string): Ride[] {
  const set = new Set(ids);
  return rides.map((r) => (set.has(r.id) ? acceptRide(r, now) : r));
}

export function rejectMany(rides: Ride[], ids: Iterable<string>, reason: string, now: string): Ride[] {
  const set = new Set(ids);
  return rides.map((r) => (set.has(r.id) ? rejectRide(r, reason, now) : r));
}

export function assignMany(rides: Ride[], ids: Iterable<string>, driver: Driver): Ride[] {
  const set = new Set(ids);
  return rides.map((r) => (set.has(r.id) ? assignDriver(r, driver) : r));
}

/* ---------- pagination (client side, mirrors Medtransport's Pagination props) ---------- */

export const PAGE_OPTIONS = [5, 10, 20, 30, 50, 100];

export interface Page<T> {
  rows: T[];
  page: number; // 1-based, clamped into range
  limit: number;
  totalCount: number;
  totalPages: number;
  from: number; // 1-based index of first row shown, 0 when empty
  to: number;
}

export function paginate<T>(all: T[], page: number, limit: number): Page<T> {
  const safeLimit = Math.max(1, Math.floor(limit) || 1);
  const totalCount = all.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (safePage - 1) * safeLimit;
  const rows = all.slice(start, start + safeLimit);
  return {
    rows,
    page: safePage,
    limit: safeLimit,
    totalCount,
    totalPages,
    from: totalCount === 0 ? 0 : start + 1,
    to: totalCount === 0 ? 0 : start + rows.length,
  };
}

/* ---------- Dispatch board (Medtransport dispatch tabs) ---------- */

export type DispatchTab =
  | 'live'
  | 'incoming'
  | 'scheduled'
  | 'arrived'
  | 'picked-up'
  | 'completed'
  | 'canceled'
  | 'open-runs';

export const DISPATCH_TABS: { key: DispatchTab; label: string }[] = [
  { key: 'live', label: 'Live' },
  { key: 'incoming', label: 'Incoming' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'picked-up', label: 'Picked Up' },
  { key: 'completed', label: 'Completed' },
  { key: 'canceled', label: 'Canceled' },
  { key: 'open-runs', label: 'Open Runs' },
];

/**
 * Which rides belong on each dispatch tab.
 *  live       – today's rides the contractor is responsible for and that are not finished
 *  incoming   – newly assigned by Maguy, awaiting Accept / Reject
 *  scheduled  – accepted / driver assigned, not yet started
 *  arrived    – driver at pickup
 *  picked-up  – patient on board
 *  completed  – done
 *  canceled   – cancelled by Maguy or rejected by the contractor
 *  open-runs  – accepted but still without a driver
 */
export function dispatchTabRides(rides: Ride[], tab: DispatchTab, today: string): Ride[] {
  switch (tab) {
    case 'live':
      return rides.filter(
        (r) => r.date === today && (r.status === 'accepted' || ACTIVE_STATUSES.includes(r.status)),
      );
    case 'incoming':
      return rides.filter((r) => r.status === 'pending');
    case 'scheduled':
      return rides.filter((r) => r.status === 'accepted' || r.status === 'assigned');
    case 'arrived':
      return rides.filter((r) => r.status === 'arrived');
    case 'picked-up':
      return rides.filter((r) => r.status === 'picked-up');
    case 'completed':
      return rides.filter((r) => r.status === 'completed');
    case 'canceled':
      return rides.filter((r) => r.status === 'cancelled' || r.status === 'rejected');
    case 'open-runs':
      return rides.filter((r) => r.status === 'accepted' && !r.driverId);
  }
}

export function dispatchCounts(rides: Ride[], today: string): Record<DispatchTab, number> {
  const out = {} as Record<DispatchTab, number>;
  for (const t of DISPATCH_TABS) out[t.key] = dispatchTabRides(rides, t.key, today).length;
  return out;
}

/** Filters a Dispatch / Schedule table understands — same keys as Medtransport's FilterRide. */
export interface RideFilters {
  search?: string;
  driverId?: string;
  accountName?: string;
  patientName?: string;
  status?: RideStatus;
  vehicleType?: Vehicle['type'];
  sort?: RideSort;
}

export type RideSort =
  | 'pickupTime'
  | '-pickupTime'
  | 'appointmentTime'
  | '-appointmentTime'
  | 'patientName'
  | '-patientName'
  | 'accountName'
  | '-accountName';

export const RIDE_SORT_OPTIONS: { value: RideSort; label: string }[] = [
  { value: 'accountName', label: 'Account Name (A - Z)' },
  { value: '-accountName', label: 'Account Name (Z - A)' },
  { value: 'patientName', label: 'Patient Name (A - Z)' },
  { value: '-patientName', label: 'Patient Name (Z - A)' },
  { value: 'pickupTime', label: 'Pickup Time (Earliest-latest)' },
  { value: '-pickupTime', label: 'Pickup Time (Latest-Earliest)' },
  { value: 'appointmentTime', label: 'Appointment Time (Earliest-latest)' },
  { value: '-appointmentTime', label: 'Appointment Time (Latest-Earliest)' },
];

export function applyRideFilters(
  rides: Ride[],
  f: RideFilters,
  drivers: Driver[],
  vehicles: Vehicle[],
): Ride[] {
  let out = rides;
  if (f.search) out = searchRides(out, f.search, drivers);
  if (f.driverId) out = out.filter((r) => r.driverId === f.driverId);
  if (f.accountName) out = out.filter((r) => r.billingAccount === f.accountName);
  if (f.patientName) out = out.filter((r) => r.patient.name === f.patientName);
  if (f.status) out = out.filter((r) => r.status === f.status);
  if (f.vehicleType) {
    const byId = new Map(vehicles.map((v) => [v.id, v]));
    out = out.filter((r) => (r.vehicleId ? byId.get(r.vehicleId)?.type === f.vehicleType : false));
  }
  return sortRides(out, f.sort);
}

export function sortRides(rides: Ride[], sort?: RideSort): Ride[] {
  if (!sort) {
    return [...rides].sort((a, b) => `${a.date} ${a.pickupTime}`.localeCompare(`${b.date} ${b.pickupTime}`));
  }
  const desc = sort.startsWith('-');
  const key = (desc ? sort.slice(1) : sort) as Exclude<RideSort, `-${string}`>;
  const val = (r: Ride) => {
    switch (key) {
      case 'pickupTime':
        return `${r.date} ${r.pickupTime}`;
      case 'appointmentTime':
        return `${r.date} ${r.appointmentTime ?? '99:99'}`;
      case 'patientName':
        return r.patient.name.toLowerCase();
      case 'accountName':
        return r.billingAccount.toLowerCase();
    }
  };
  const sorted = [...rides].sort((a, b) => val(a).localeCompare(val(b)));
  return desc ? sorted.reverse() : sorted;
}

/** Count of active filters shown as chips (search and sort included, like Medtransport's ActiveFilters). */
export function activeFilterEntries(f: RideFilters): { key: keyof RideFilters; value: string }[] {
  return (Object.keys(f) as (keyof RideFilters)[])
    .filter((k) => f[k] !== undefined && f[k] !== '')
    .map((k) => ({ key: k, value: String(f[k]) }));
}

/** Drivers with no ride starting in the next `minutes` from `nowHHMM` today (the
 *  "Drivers No Ride Scheduled in Next" control on Medtransport's Live tab). */
export function driversFreeInNext(
  drivers: Driver[],
  rides: Ride[],
  today: string,
  nowHHMM: string,
  minutes: number,
): Driver[] {
  const now = toMinutes(nowHHMM);
  return drivers.filter((d) => {
    if (d.status !== 'active') return false;
    const busy = rides.some((r) => {
      if (r.driverId !== d.id || r.date !== today) return false;
      if (!(r.status === 'assigned' || IN_PROGRESS_STATUSES.includes(r.status))) return false;
      const start = toMinutes(r.pickupTime);
      return IN_PROGRESS_STATUSES.includes(r.status) || (start >= now && start - now <= minutes);
    });
    return !busy;
  });
}

/* ---------- recurring rides ---------- */

export const RECURRING_STATUS_LABEL: Record<RecurringStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  paused: 'Paused',
  ended: 'Ended',
  rejected: 'Rejected',
};

export function recurringBadgeVariant(status: RecurringStatus): BadgeVariant {
  switch (status) {
    case 'active':
      return 'greenish';
    case 'pending':
      return 'yellowish';
    case 'paused':
      return 'orangy';
    case 'ended':
      return 'grayish';
    case 'rejected':
      return 'reddish';
  }
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Mon, Wed, Fri · 10:30 AM" — the Recurrence column. */
export function formatRecurrence(days: Weekday[], pickupTime: string) {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const label =
    sorted.length === 7
      ? 'Every day'
      : sorted.length === 5 && sorted.every((d) => d >= 1 && d <= 5)
        ? 'Weekdays'
        : sorted.map((d) => WEEKDAY_SHORT[d]).join(', ');
  return `${label} · ${formatTime12(pickupTime)}`;
}

export function canAcceptRecurring(s: RecurringRide) {
  return s.status === 'pending';
}
export function canRejectRecurring(s: RecurringRide) {
  return s.status === 'pending' || s.status === 'active';
}
export function canAssignRecurringDriver(s: RecurringRide) {
  return s.status === 'active' || s.status === 'paused';
}

export function acceptRecurring(s: RecurringRide, now: string): RecurringRide {
  if (!canAcceptRecurring(s)) return s;
  return { ...s, status: 'active', acceptedAt: now };
}

export function rejectRecurring(s: RecurringRide, reason: string, now: string): RecurringRide {
  const trimmed = reason.trim();
  if (!canRejectRecurring(s) || trimmed.length === 0) return s;
  return { ...s, status: 'rejected', rejectReason: trimmed, rejectedAt: now, driverId: undefined, vehicleId: undefined };
}

export function assignRecurringDriver(s: RecurringRide, driver: Driver): RecurringRide {
  if (!canAssignRecurringDriver(s)) return s;
  if (!driverCanBeAssigned(driver)) return s;
  return { ...s, driverId: driver.id, vehicleId: driver.vehicleId };
}

export function unassignRecurringDriver(s: RecurringRide): RecurringRide {
  return { ...s, driverId: undefined, vehicleId: undefined };
}

/** Rides that fall inside a pay period (completed only — the statement pays finished rides). */
export function ridesInPeriod(rides: Ride[], start: string, end: string) {
  return rides
    .filter((r) => r.status === 'completed' && r.date >= start && r.date <= end)
    .sort((a, b) => `${a.date} ${a.pickupTime}`.localeCompare(`${b.date} ${b.pickupTime}`));
}

/** Occurrences per week for a series. */
export function occurrencesPerWeek(s: RecurringRide) {
  return new Set(s.days).size * (s.tripType === 'Round trip' ? 2 : 1);
}

/** Expand a series into dated occurrences within [from, to] (inclusive, YYYY-MM-DD).
 *  Only active / paused series produce dates; pending, rejected and ended do not. */
export function expandRecurring(s: RecurringRide, from: string, to: string): RecurringOccurrence[] {
  if (!(s.status === 'active' || s.status === 'paused')) return [];
  const start = from > s.startDate ? from : s.startDate;
  const end = to < s.endDate ? to : s.endDate;
  if (start > end) return [];
  const days = new Set(s.days);
  const out: RecurringOccurrence[] = [];
  const cursor = isoToDate(start);
  const last = isoToDate(end);
  while (cursor <= last) {
    if (days.has(cursor.getDay() as Weekday)) {
      const date = dateToIso(cursor);
      out.push({
        id: `${s.id}@${date}`,
        recurringId: s.id,
        requestId: s.requestId,
        date,
        pickupTime: s.pickupTime,
        appointmentTime: s.appointmentTime,
        patient: s.patient,
        pickup: s.pickup,
        dropoff: s.dropoff,
        tripType: s.tripType,
        payableAmount: s.payableAmount,
        driverId: s.driverId,
        vehicleId: s.vehicleId,
        status: s.status,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function nextOccurrence(s: RecurringRide, today: string): string | undefined {
  const horizon = addDays(today, 60);
  return expandRecurring(s, today, horizon)[0]?.date;
}

/* ---------- calendar ---------- */

export interface CalendarEvent {
  id: string;
  date: string;
  time: string; // HH:mm
  title: string; // patient
  subtitle: string; // drop-off
  status: RideStatus | RecurringStatus;
  kind: 'ride' | 'recurring';
  rideId?: string;
  recurringId?: string;
  driverId?: string;
  payableAmount: number;
}

/** Everything that belongs on the contractor's calendar between two dates: assigned rides plus
 *  recurring occurrences that have not been materialised into a ride yet. Rejected rides are out. */
export function calendarEvents(rides: Ride[], series: RecurringRide[], from: string, to: string): CalendarEvent[] {
  const events: CalendarEvent[] = rides
    .filter((r) => r.date >= from && r.date <= to && r.status !== 'rejected')
    .map((r) => ({
      id: r.id,
      date: r.date,
      time: r.pickupTime,
      title: r.patient.name,
      subtitle: r.dropoff,
      status: r.status,
      kind: 'ride',
      rideId: r.id,
      recurringId: r.recurringId,
      driverId: r.driverId,
      payableAmount: r.payableAmount,
    }));
  const materialised = new Set(rides.filter((r) => r.recurringId).map((r) => `${r.recurringId}@${r.date}`));
  for (const s of series) {
    for (const o of expandRecurring(s, from, to)) {
      if (materialised.has(o.id)) continue;
      events.push({
        id: o.id,
        date: o.date,
        time: o.pickupTime,
        title: o.patient.name,
        subtitle: o.dropoff,
        status: o.status,
        kind: 'recurring',
        recurringId: o.recurringId,
        driverId: o.driverId,
        payableAmount: o.payableAmount,
      });
    }
  }
  return events.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

/** 6 weeks × 7 days of ISO dates covering a month, weeks starting Sunday (Medtransport's calendar). */
export function monthGrid(year: number, month0: number): string[][] {
  const first = new Date(year, month0, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const weeks: string[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(dateToIso(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function isoToDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dateToIso(dt: Date) {
  const y = dt.getFullYear();
  const m = (dt.getMonth() + 1).toString().padStart(2, '0');
  const d = dt.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, n: number) {
  const dt = isoToDate(iso);
  dt.setDate(dt.getDate() + n);
  return dateToIso(dt);
}
