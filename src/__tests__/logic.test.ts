import { describe, expect, it } from 'vitest';
import * as L from '@/demo/logic';
import { DRIVERS, RIDES, TODAY } from '@/demo/data';
import type { Driver, Ride } from '@/demo/types';

const NOW = '2026-11-02T08:00:00';
const pending = RIDES.find((r) => r.status === 'pending')!;
const accepted = RIDES.find((r) => r.status === 'accepted')!;
const assigned = RIDES.find((r) => r.status === 'assigned')!;
const completed = RIDES.find((r) => r.status === 'completed')!;
const priya = DRIVERS.find((d) => d.id === 'drv_01')!;
const tomas = DRIVERS.find((d) => d.id === 'drv_04')!; // expired PASS
const aisha = DRIVERS.find((d) => d.id === 'drv_05')!; // on leave

describe('accept / reject transitions', () => {
  it('accepts only pending rides', () => {
    expect(L.acceptRide(pending, NOW).status).toBe('accepted');
    expect(L.acceptRide(pending, NOW).acceptedAt).toBe(NOW);
    expect(L.acceptRide(completed, NOW)).toBe(completed);
    expect(L.acceptRide(accepted, NOW)).toBe(accepted);
  });

  it('rejects pending / accepted / assigned and clears the driver', () => {
    const r = L.rejectRide(assigned, 'No driver available', NOW);
    expect(r.status).toBe('rejected');
    expect(r.driverId).toBeUndefined();
    expect(r.vehicleId).toBeUndefined();
    expect(r.rejectReason).toBe('No driver available');
    expect(L.rejectRide(completed, 'x', NOW)).toBe(completed);
  });

  it('refuses a reject without a reason', () => {
    expect(L.rejectRide(pending, '', NOW)).toBe(pending);
    expect(L.rejectRide(pending, '   ', NOW)).toBe(pending);
  });

  it('bulk accept touches only pending rides', () => {
    const out = L.acceptAll(RIDES, NOW);
    expect(out.filter((r) => r.status === 'pending')).toHaveLength(0);
    expect(out.filter((r) => r.status === 'accepted')).toHaveLength(
      RIDES.filter((r) => r.status === 'pending' || r.status === 'accepted').length,
    );
    expect(out.find((r) => r.id === completed.id)).toEqual(completed);
  });

  it('bulk reject touches only pending rides and requires a reason', () => {
    const out = L.rejectAllPending(RIDES, 'Outside our service area', NOW);
    expect(out.filter((r) => r.status === 'pending')).toHaveLength(0);
    expect(out.find((r) => r.id === assigned.id)?.status).toBe('assigned');
    expect(L.rejectAllPending(RIDES, '', NOW)).toEqual(RIDES);
  });
});

describe('driver assignment', () => {
  it('assigns an active driver to an accepted ride and carries their vehicle', () => {
    const r = L.assignDriver(accepted, priya);
    expect(r.status).toBe('assigned');
    expect(r.driverId).toBe('drv_01');
    expect(r.vehicleId).toBe('veh_01');
  });

  it('does not assign to a pending or completed ride', () => {
    expect(L.assignDriver(pending, priya)).toBe(pending);
    expect(L.assignDriver(completed, priya)).toBe(completed);
  });

  it('does not assign a non-active driver', () => {
    expect(L.assignDriver(accepted, aisha)).toBe(accepted);
  });

  it('flags drivers with expired compliance as unassignable', () => {
    expect(L.driverCanBeAssigned(priya)).toBe(true);
    expect(L.driverCanBeAssigned(tomas)).toBe(false);
    expect(L.worstCompliance(tomas.compliance)).toBe('expired');
    expect(L.worstCompliance(priya.compliance)).toBe('valid');
  });

  it('unassign returns the ride to accepted', () => {
    const r = L.unassignDriver(assigned);
    expect(r.status).toBe('accepted');
    expect(r.driverId).toBeUndefined();
    expect(L.unassignDriver(completed)).toBe(completed);
  });

  it('availableDrivers excludes drivers with an overlapping active ride', () => {
    // ride_06 (today 09:30) is en-route with drv_01; ride_07 (today 11:00) is assigned to drv_02;
    // ride_05 (today 08:00, drv_03) is 120 min away so drv_03 is free.
    const probe: Ride = { ...accepted, date: TODAY, pickupTime: '10:00' };
    const free = L.availableDrivers(DRIVERS, RIDES, probe).map((d) => d.id);
    expect(free).not.toContain('drv_01');
    expect(free).not.toContain('drv_02');
    expect(free).toContain('drv_03');
    expect(free).not.toContain('drv_05'); // on leave
    const later: Ride = { ...accepted, date: TODAY, pickupTime: '13:00' };
    expect(L.availableDrivers(DRIVERS, RIDES, later).map((d) => d.id)).toContain('drv_01');
  });
});

describe('counts and filters', () => {
  it('countRides sums to total and buckets in-progress correctly', () => {
    const c = L.countRides(RIDES);
    expect(c.total).toBe(RIDES.length);
    expect(c.pending + c.accepted + c.assigned + c.inProgress + c.completed + c.rejected + c.cancelled).toBe(c.total);
    expect(c.inProgress).toBe(RIDES.filter((r) => L.IN_PROGRESS_STATUSES.includes(r.status)).length);
    expect(RIDES.some((r) => r.status === 'arrived')).toBe(true); // "Arrived" is a real dispatch state
  });

  it('filterByTab groups rejected + cancelled and en-route + arrived + picked-up', () => {
    expect(L.filterByTab(RIDES, 'rejected').every((r) => r.status === 'rejected' || r.status === 'cancelled')).toBe(true);
    expect(L.filterByTab(RIDES, 'in-progress').every((r) => L.IN_PROGRESS_STATUSES.includes(r.status))).toBe(true);
    expect(L.filterByTab(RIDES, 'in-progress').some((r) => r.status === 'arrived')).toBe(true);
    expect(L.filterByTab(RIDES, 'pending').every((r) => r.status === 'pending')).toBe(true);
    expect(L.filterByTab(RIDES, 'all')).toHaveLength(RIDES.length);
  });

  it('searchRides matches ride number, patient, address and driver name', () => {
    expect(L.searchRides(RIDES, 'MGY-248105', DRIVERS)).toHaveLength(1);
    expect(L.searchRides(RIDES, 'whitfield', DRIVERS).length).toBeGreaterThan(0);
    expect(L.searchRides(RIDES, 'Elena', DRIVERS).every((r) => r.driverId === 'drv_03')).toBe(true);
    expect(L.searchRides(RIDES, '', DRIVERS)).toBe(RIDES);
  });

  it('pendingByDeadline sorts by respondBy ascending', () => {
    const p = L.pendingByDeadline(RIDES);
    for (let i = 1; i < p.length; i++) expect(p[i - 1].respondBy <= p[i].respondBy).toBe(true);
  });

  it('upcoming only includes open rides from today forward, soonest first', () => {
    const u = L.upcoming(RIDES, TODAY);
    expect(u.every((r) => r.date >= TODAY && L.OPEN_STATUSES.includes(r.status))).toBe(true);
    for (let i = 1; i < u.length; i++)
      expect(`${u[i - 1].date} ${u[i - 1].pickupTime}` <= `${u[i].date} ${u[i].pickupTime}`).toBe(true);
  });
});

describe('money and formatting', () => {
  it('formatMoney works in integer cents', () => {
    expect(L.formatMoney(5823)).toBe('$58.23');
    expect(L.formatMoney(168420)).toBe('$1,684.20');
    expect(L.formatMoney(5)).toBe('$0.05');
    expect(L.formatMoney(-1200)).toBe('-$12.00');
  });

  it('sumPayable adds only the picked rides and never invents a value', () => {
    const completedSum = RIDES.filter((r) => r.status === 'completed').reduce((s, r) => s + r.payableAmount, 0);
    expect(L.sumPayable(RIDES, (r) => r.status === 'completed')).toBe(completedSum);
    expect(L.sumPayable(RIDES, () => false)).toBe(0);
  });

  it('formatTime12 converts 24h times', () => {
    expect(L.formatTime12('08:15')).toBe('8:15 AM');
    expect(L.formatTime12('00:05')).toBe('12:05 AM');
    expect(L.formatTime12('12:00')).toBe('12:00 PM');
    expect(L.formatTime12('16:30')).toBe('4:30 PM');
  });

  it('badge mapping follows the Medtransport status groups', () => {
    expect(L.rideBadgeVariant('completed')).toBe('greenish');
    expect(L.rideBadgeVariant('accepted')).toBe('greenish');
    expect(L.rideBadgeVariant('pending')).toBe('yellowish');
    expect(L.rideBadgeVariant('assigned')).toBe('bluish');
    expect(L.rideBadgeVariant('rejected')).toBe('reddish');
    expect(L.rideBadgeVariant('cancelled')).toBe('reddish');
  });
});

describe('mock data integrity', () => {
  it('every assigned / in-progress ride references an existing active driver', () => {
    for (const r of RIDES) {
      if (L.ACTIVE_STATUSES.includes(r.status)) {
        const d = DRIVERS.find((x) => x.id === r.driverId) as Driver | undefined;
        expect(d, r.rideNo).toBeDefined();
        expect(d!.status).toBe('active');
      }
    }
  });

  it('payable never exceeds billable and all amounts are integer cents', () => {
    for (const r of RIDES) {
      expect(Number.isInteger(r.billableAmount)).toBe(true);
      expect(Number.isInteger(r.payableAmount)).toBe(true);
      expect(Number.isInteger(r.pickUpCharge)).toBe(true);
      expect(r.payableAmount).toBeLessThanOrEqual(r.billableAmount);
    }
  });

  it('ride numbers are unique', () => {
    expect(new Set(RIDES.map((r) => r.rideNo)).size).toBe(RIDES.length);
  });
});
