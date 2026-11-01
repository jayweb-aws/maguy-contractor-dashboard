# Maguy Contractor Portal — clickable prototype

Web prototype of the dashboard an **Independent Contractor** (HR → Employee → Independent
Contractor) uses to work rides that Maguy Medical Transport dispatches to their company.

Mock data only. No backend, no real patients, drivers, accounts or amounts.

## What it covers

| Area | Screen | Interactions |
| --- | --- | --- |
| Dashboard | KPIs, rides awaiting response, payable today, today's schedule, driver overview, notifications | Accept / Reject (with reason), Accept all / Reject all, assign driver inline, open ride drawer |
| Rides | Dispatch board with the Medtransport contractor-schedule columns (Ride ID, Date/Time, Client, Pickup → Drop-off, Driver, Vehicle, Billable Miles, Billable Amt, Commission, Pick Up Charge, Payable Amt, Billing Account, Status, Action) | Tabs All / Pending / Accepted / Assigned / In Progress / Completed / Rejected, search, Accept / Reject / Assign / Remove driver, bulk actions, ride drawer |
| Ride History | Completed / rejected / cancelled with actual pickup & drop-off times | Filter by driver |
| My Drivers | Employee ID, Name, Role, Phone, Vehicle, Hire Date, Compliance, Status | Add Driver (validated form), driver drawer, toggle active |
| Vehicles | Fleet with ownership (Contractor-owned / Maguy-owned), inspection and insurance dates | — |
| Compliance & Documents | Company + driver documents; valid / expiring / expired / missing | Simulated upload clears the driver's flag |
| Contracts & Agreements | Service agreement, rate schedules, addenda | — (signing out of scope) |
| Pay Period Reports | Report ID, period, rides, payable amount, status + trend chart | — |
| Notifications | Ride / compliance / pay / system | Mark read, deep-link to ride |
| Profile | Business info as held by Maguy HR, dispatch preferences, portal users | — |

Business rules enforced in `src/demo/logic.ts` (unit-tested): accept only from *pending*; reject
needs a reason and clears the driver; assign only to an *active* driver with no *expired*
compliance item and no overlapping active ride; bulk actions touch only pending rides; money is
integer cents.

## Design system

Everything visual is lifted from the Medtransport web app so the portal reads as part of the same
product: `tailwind.config.mjs` and the CSS variables in `src/index.css` are copies of the
Medtransport files, `src/components/ui/*` are the same shadcn/ui components (badge variants
greenish / bluish / yellowish / reddish / grayish, button variants bluish / whitish / greenish /
redish / outline-*), Poppins + Inter, the 260 px white sidebar with `#F1F6FF` active state, the
`bg-primary` table header and the `#E6EBF3` card border.

## Open items (owner decisions)

- Pay rate / commission formula behind **Payable Amount** is not confirmed; the prototype displays
  sample per-ride figures and does not compute them.
- Whether a contractor's driver can decline a ride the contractor assigned to them.
- Document upload, e-signature and PDF download are stubs.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run build      # tsc && vite build
```
