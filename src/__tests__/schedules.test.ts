import { describe, expect, it } from 'vitest';
import * as L from '@/demo/logic';
import { DRIVERS, PAY_PERIODS, RECURRING, RIDES, TODAY, VEHICLES } from '@/demo/data';
import type { RecurringRide, Ride } from '@/demo/types';

const NOW = '2026-11-02T08:00:00';
const priya = DRIVERS.find((d) => d.id === 'drv_01')!;
const tomas = DRIVERS.find((d) => d.id === 'drv_04')!; // expired PASS

describe('pagination', () => {
  const rows = Array.from({ length: 23 }, (_, i) => i + 1);

  it('slices the requested page and reports the range', () => {
    const p = L.paginate(rows, 2, 10);
    expect(p.rows).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(p.totalPages).toBe(3);
    expect(p.totalCount).toBe(23);
    expect(p.from).toBe(11);
    expect(p.to).toBe(20);
  });

  it('clamps an out-of-range page into the last page', () => {
    const p = L.paginate(rows, 9, 10);
    expect(p.page).toBe(3);
    expect(p.rows).toEqual([21, 22, 23]);
    expect(p.to).toBe(23);
    expect(L.paginate(rows, 0, 10).page).toBe(1);
  });

  it('handles an empty list without a zero-row page', () => {
    const p = L.paginate([], 1, 10);
    expect(p.rows).toEqual([]);
    expect(p.totalPages).toBe(1);
    expect(p.from).toBe(0);
    expect(p.to).toBe(0);
  });

  it('every rows-per-page option paginates the demo rides without losing a row', () => {
    for (const limit of L.PAGE_OPTIONS) {
      const total = L.paginate(RIDES, 1, limit).totalPages;
      const seen = new Set<string>();
      for (let page = 1; page <= total; page++) L.paginate(RIDES, page, limit).rows.forEach((r) => seen.add(r.id));
      expect(seen.size).toBe(RIDES.length);
    }
  });
});

describe('dispatch tabs', () => {
  it('maps every ride to the Maguy dispatch tabs by status', () => {
    expect(L.dispatchTabRides(RIDES, 'incoming', TODAY).every((r) => r.status === 'pending')).toBe(true);
    expect(L.dispatchTabRides(RIDES, 'arrived', TODAY).every((r) => r.status === 'arrived')).toBe(true);
    expect(L.dispatchTabRides(RIDES, 'picked-up', TODAY).every((r) => r.status === 'picked-up')).toBe(true);
    expect(L.dispatchTabRides(RIDES, 'completed', TODAY).every((r) => r.status === 'completed')).toBe(true);
    expect(L.dispatchTabRides(RIDES, 'canceled', TODAY).every((r) => r.status === 'cancelled' || r.status === 'rejected')).toBe(true);
    expect(L.dispatchTabRides(RIDES, 'scheduled', TODAY).every((r) => r.status === 'accepted' || r.status === 'assigned')).toBe(true);
  });

  it('live is today only and never includes pending or finished rides', () => {
    const live = L.dispatchTabRides(RIDES, 'live', TODAY);
    expect(live.length).toBeGreaterThan(0);
    expect(live.every((r) => r.date === TODAY)).toBe(true);
    expect(live.some((r) => ['pending', 'completed', 'cancelled', 'rejected'].includes(r.status))).toBe(false);
  });

  it('open runs are accepted rides without a driver', () => {
    const open = L.dispatchTabRides(RIDES, 'open-runs', TODAY);
    expect(open.length).toBeGreaterThan(0);
    expect(open.every((r) => r.status === 'accepted' && !r.driverId)).toBe(true);
  });

  it('counts match the per-tab lists', () => {
    const c = L.dispatchCounts(RIDES, TODAY);
    for (const t of L.DISPATCH_TABS) expect(c[t.key]).toBe(L.dispatchTabRides(RIDES, t.key, TODAY).length);
  });
});

describe('ride filters and sort', () => {
  it('filters by driver, account, patient, status and vehicle type', () => {
    expect(L.applyRideFilters(RIDES, { driverId: 'drv_01' }, DRIVERS, VEHICLES).every((r) => r.driverId === 'drv_01')).toBe(true);
    expect(L.applyRideFilters(RIDES, { accountName: 'Private Pay' }, DRIVERS, VEHICLES).every((r) => r.billingAccount === 'Private Pay')).toBe(true);
    expect(L.applyRideFilters(RIDES, { patientName: 'R. Whitfield' }, DRIVERS, VEHICLES).every((r) => r.patient.name === 'R. Whitfield')).toBe(true);
    expect(L.applyRideFilters(RIDES, { status: 'completed' }, DRIVERS, VEHICLES).every((r) => r.status === 'completed')).toBe(true);
    const vans = L.applyRideFilters(RIDES, { vehicleType: 'Stretcher Van' }, DRIVERS, VEHICLES);
    expect(vans.length).toBeGreaterThan(0);
    expect(vans.every((r) => VEHICLES.find((v) => v.id === r.vehicleId)?.type === 'Stretcher Van')).toBe(true);
  });

  it('filters stack and an empty filter object returns everything', () => {
    const both = L.applyRideFilters(RIDES, { driverId: 'drv_03', status: 'completed' }, DRIVERS, VEHICLES);
    expect(both.every((r) => r.driverId === 'drv_03' && r.status === 'completed')).toBe(true);
    expect(L.applyRideFilters(RIDES, {}, DRIVERS, VEHICLES)).toHaveLength(RIDES.length);
  });

  it('sorts by the Medtransport sort options in both directions', () => {
    const asc = L.sortRides(RIDES, 'patientName').map((r) => r.patient.name.toLowerCase());
    expect(asc).toEqual([...asc].sort());
    const desc = L.sortRides(RIDES, '-patientName').map((r) => r.patient.name.toLowerCase());
    expect(desc).toEqual([...asc].reverse());
    const byPickup = L.sortRides(RIDES, '-pickupTime');
    for (let i = 1; i < byPickup.length; i++) {
      expect(`${byPickup[i - 1].date} ${byPickup[i - 1].pickupTime}` >= `${byPickup[i].date} ${byPickup[i].pickupTime}`).toBe(true);
    }
  });

  it('activeFilterEntries lists only set filters', () => {
    expect(L.activeFilterEntries({ search: '', driverId: 'drv_01', status: undefined })).toEqual([{ key: 'driverId', value: 'drv_01' }]);
  });

  it('driversFreeInNext excludes drivers mid-ride or starting within the window', () => {
    // 08:00 today: drv_03 is picked-up (ride_05) and drv_01 is en-route (ride_06) → both busy now;
    // drv_02's next ride (ride_07) starts at 11:00 → free for a 60 min window, busy for 200.
    const free60 = L.driversFreeInNext(DRIVERS, RIDES, TODAY, '08:00', 60).map((d) => d.id);
    expect(free60).not.toContain('drv_03');
    expect(free60).not.toContain('drv_01');
    expect(free60).toContain('drv_02');
    const free200 = L.driversFreeInNext(DRIVERS, RIDES, TODAY, '08:00', 200).map((d) => d.id);
    expect(free200).not.toContain('drv_02');
    expect(free200).not.toContain('drv_05'); // on leave
  });
});

describe('bulk actions', () => {
  const pendingIds = RIDES.filter(L.canAccept).map((r) => r.id);
  const assigned = RIDES.find((r) => r.status === 'assigned')!;

  it('acceptMany only touches the selected pending rides', () => {
    const out = L.acceptMany(RIDES, [pendingIds[0], assigned.id], NOW);
    expect(out.find((r) => r.id === pendingIds[0])?.status).toBe('accepted');
    expect(out.find((r) => r.id === pendingIds[1])?.status).toBe('pending');
    expect(out.find((r) => r.id === assigned.id)).toBe(assigned);
  });

  it('rejectMany needs a reason and clears drivers on the selected rides', () => {
    const out = L.rejectMany(RIDES, [assigned.id], 'Vehicle out of service', NOW);
    expect(out.find((r) => r.id === assigned.id)?.status).toBe('rejected');
    expect(out.find((r) => r.id === assigned.id)?.driverId).toBeUndefined();
    expect(L.rejectMany(RIDES, [assigned.id], '  ', NOW)).toEqual(RIDES);
  });

  it('assignMany assigns only accepted / assigned rides and skips the rest', () => {
    const accepted = RIDES.filter((r) => r.status === 'accepted').map((r) => r.id);
    const out = L.assignMany(RIDES, [...accepted, pendingIds[0]], priya);
    expect(out.filter((r) => accepted.includes(r.id)).every((r) => r.status === 'assigned' && r.driverId === 'drv_01')).toBe(true);
    expect(out.find((r) => r.id === pendingIds[0])?.status).toBe('pending');
  });
});

describe('recurring rides', () => {
  const active = RECURRING.find((s) => s.id === 'rec_01')!; // Tue / Thu / Sat
  const pending = RECURRING.find((s) => s.status === 'pending')!;
  const ended = RECURRING.find((s) => s.status === 'ended')!;

  it('formats the recurrence like the Medtransport column', () => {
    expect(L.formatRecurrence([2, 4, 6], '10:30')).toBe('Tue, Thu, Sat · 10:30 AM');
    expect(L.formatRecurrence([1, 2, 3, 4, 5], '07:30')).toBe('Weekdays · 7:30 AM');
    expect(L.formatRecurrence([0, 1, 2, 3, 4, 5, 6], '14:00')).toBe('Every day · 2:00 PM');
    expect(L.formatRecurrence([5, 1], '09:00')).toBe('Mon, Fri · 9:00 AM');
  });

  it('expands an active series onto its weekdays only, inside its date range', () => {
    const occ = L.expandRecurring(active, '2026-11-01', '2026-11-14');
    // Nov 2026: Tue 3, Thu 5, Sat 7, Tue 10, Thu 12, Sat 14
    expect(occ.map((o) => o.date)).toEqual(['2026-11-03', '2026-11-05', '2026-11-07', '2026-11-10', '2026-11-12', '2026-11-14']);
    expect(occ.every((o) => o.pickupTime === '10:30' && o.driverId === 'drv_03')).toBe(true);
    expect(L.expandRecurring(active, '2027-06-01', '2027-06-30')).toEqual([]); // after endDate
  });

  it('pending, rejected and ended series produce no occurrences', () => {
    expect(L.expandRecurring(pending, TODAY, L.addDays(TODAY, 60))).toEqual([]);
    expect(L.expandRecurring(ended, '2026-01-01', '2026-12-31')).toEqual([]);
    expect(L.expandRecurring({ ...active, status: 'rejected' }, TODAY, L.addDays(TODAY, 30))).toEqual([]);
  });

  it('accept / reject transitions and driver assignment rules', () => {
    expect(L.acceptRecurring(pending, NOW).status).toBe('active');
    expect(L.acceptRecurring(active, NOW)).toBe(active);
    expect(L.rejectRecurring(pending, '', NOW)).toBe(pending);
    const stopped = L.rejectRecurring(active, 'Driver left the company', NOW);
    expect(stopped.status).toBe('rejected');
    expect(stopped.driverId).toBeUndefined();
    expect(L.assignRecurringDriver(active, tomas)).toBe(active); // expired compliance
    expect(L.assignRecurringDriver(active, priya).driverId).toBe('drv_01');
    expect(L.assignRecurringDriver(pending, priya)).toBe(pending); // must accept first
  });

  it('occurrencesPerWeek doubles round trips', () => {
    expect(L.occurrencesPerWeek(active)).toBe(6);
    const oneWay: RecurringRide = { ...active, tripType: 'One-way' };
    expect(L.occurrencesPerWeek(oneWay)).toBe(3);
  });

  it('nextOccurrence is on or after today and matches a series weekday', () => {
    const n = L.nextOccurrence(active, TODAY)!;
    expect(n >= TODAY).toBe(true);
    expect(active.days).toContain(L.isoToDate(n).getDay());
    expect(L.nextOccurrence(pending, TODAY)).toBeUndefined();
  });
});

describe('calendar', () => {
  it('monthGrid covers six Sunday-start weeks around the month', () => {
    const grid = L.monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(grid).toHaveLength(6);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid[0][0]).toBe('2026-11-01');
    expect(grid[5][6]).toBe('2026-12-12');
    expect(grid.flat().every((d) => L.isoToDate(d).getDay() === grid.flat().indexOf(d) % 7)).toBe(true);
  });

  it('calendarEvents merges rides with recurring occurrences and skips materialised dates', () => {
    const from = '2026-11-01';
    const to = '2026-11-30';
    const events = L.calendarEvents(RIDES, RECURRING, from, to);
    expect(events.every((e) => e.date >= from && e.date <= to)).toBe(true);
    expect(events.some((e) => e.kind === 'recurring')).toBe(true);
    expect(events.some((e) => e.status === 'rejected')).toBe(false);
    // ride_02 is the materialised rec_01 occurrence on 2026-11-03: no duplicate recurring chip that day
    const nov3 = events.filter((e) => e.date === '2026-11-03' && (e.recurringId === 'rec_01' || e.rideId === 'ride_02'));
    expect(nov3).toHaveLength(1);
    expect(nov3[0].kind).toBe('ride');
    for (let i = 1; i < events.length; i++) expect(`${events[i - 1].date} ${events[i - 1].time}` <= `${events[i].date} ${events[i].time}`).toBe(true);
  });

  it('date helpers round-trip and add days across month ends', () => {
    expect(L.dateToIso(L.isoToDate('2026-11-02'))).toBe('2026-11-02');
    expect(L.addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(L.addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('ride edit page rules', () => {
  const assigned = RIDES.find((r) => r.status === 'assigned')!;
  const accepted = RIDES.find((r) => r.status === 'accepted' && !r.driverId)!;
  const completed = RIDES.find((r) => r.status === 'completed')!;
  const rejected = RIDES.find((r) => r.status === 'rejected')!;

  it('status only moves forward along the ride lifecycle and needs a driver', () => {
    expect(L.nextStatuses(assigned)).toEqual(['en-route', 'arrived', 'picked-up', 'completed']);
    expect(L.nextStatuses({ ...assigned, status: 'arrived' })).toEqual(['picked-up', 'completed']);
    expect(L.nextStatuses(completed)).toEqual([]);
    expect(L.nextStatuses(accepted)).toEqual([]); // no driver yet
    expect(L.canSetStatus(assigned, 'assigned')).toBe(false);
    expect(L.setRideStatus({ ...assigned, status: 'arrived' }, 'en-route', '10:00', NOW)).toEqual({ ...assigned, status: 'arrived' });
  });

  it('setRideStatus stamps actual times on pickup and completion', () => {
    const picked = L.setRideStatus(assigned, 'picked-up', '09:05', NOW);
    expect(picked.status).toBe('picked-up');
    expect(picked.actualPickupTime).toBe('09:05');
    const done = L.setRideStatus(picked, 'completed', '09:40', NOW);
    expect(done.actualPickupTime).toBe('09:05');
    expect(done.actualDropoffTime).toBe('09:40');
    expect(done.completedAt).toBe(NOW);
  });

  it('applyRideEdit changes only contractor fields, assigns through the driver rules and refuses finished rides', () => {
    const edited = L.applyRideEdit(accepted, { driverId: 'drv_01', notes: 'Call on arrival', pickupMileage: 100, dropMileage: 112 }, DRIVERS);
    expect(edited.status).toBe('assigned');
    expect(edited.driverId).toBe('drv_01');
    expect(edited.vehicleId).toBe('veh_01');
    expect(edited.notes).toBe('Call on arrival');
    expect(edited.patient).toEqual(accepted.patient);
    expect(edited.payableAmount).toBe(accepted.payableAmount);
    expect(L.applyRideEdit(accepted, { driverId: 'drv_04' }, DRIVERS).driverId).toBeUndefined(); // expired compliance
    expect(L.applyRideEdit(assigned, { driverId: '' }, DRIVERS).status).toBe('accepted'); // clearing the driver un-assigns
    expect(L.applyRideEdit(rejected, { notes: 'x' }, DRIVERS)).toBe(rejected);
    expect(L.canEditRide(completed)).toBe(true);
  });

  it('applyRideEdit refuses an odometer that runs backwards', () => {
    const out = L.applyRideEdit(assigned, { pickupMileage: 500, dropMileage: 480 }, DRIVERS);
    expect(out.pickupMileage).toBe(500);
    expect(out.dropMileage).toBe(assigned.dropMileage);
  });

  it('ridesInPeriod returns completed rides inside the window, oldest first', () => {
    const rows = L.ridesInPeriod(RIDES, L.addDays(TODAY, -29), L.addDays(TODAY, -16));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.status === 'completed' && r.date >= L.addDays(TODAY, -29) && r.date <= L.addDays(TODAY, -16))).toBe(true);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].date <= rows[i].date).toBe(true);
  });

  it('pay period statements agree with the rides inside them', () => {
    for (const p of PAY_PERIODS) {
      const rows = L.ridesInPeriod(RIDES, p.start, p.end);
      expect(p.rides).toBe(rows.length);
      expect(p.payableAmount).toBe(rows.reduce((s, r) => s + r.payableAmount, 0));
    }
  });
});

describe('mock data integrity (schedules)', () => {
  it('rides linked to a series fall on that series weekday and time', () => {
    for (const r of RIDES.filter((x) => x.recurringId)) {
      const s = RECURRING.find((x) => x.id === r.recurringId)!;
      expect(s, r.rideNo).toBeDefined();
      expect(s.days).toContain(L.isoToDate(r.date).getDay());
      expect(r.pickupTime).toBe(s.pickupTime);
    }
  });

  it('recurring amounts are integer cents and payable never exceeds billable', () => {
    for (const s of RECURRING) {
      expect(Number.isInteger(s.payableAmount)).toBe(true);
      expect(s.payableAmount).toBeLessThanOrEqual(s.billableAmount);
      expect(s.startDate <= s.endDate).toBe(true);
      expect(new Set(s.requestId).size).toBeGreaterThan(0);
    }
    expect(new Set(RECURRING.map((s) => s.requestId)).size).toBe(RECURRING.length);
  });

  it('history gives every rows-per-page option more than one page', () => {
    const history: Ride[] = RIDES.filter((r) => ['completed', 'rejected', 'cancelled'].includes(r.status));
    expect(history.length).toBeGreaterThan(20);
  });
});
