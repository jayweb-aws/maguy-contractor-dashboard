# Maguy Contractor Portal — clickable prototype

Web prototype of the dashboard an **Independent Contractor** (HR → Employee → Independent
Contractor) uses to work rides that Maguy Medical Transport dispatches to their company.

Mock data only. No backend, no real patients, drivers, accounts or amounts.

## What it covers

| Area | Screen | Interactions |
| --- | --- | --- |
| Dashboard | KPIs, rides awaiting response, payable today, today's schedule, driver overview, notifications | Accept / Reject (with reason), Accept all / Reject all, assign driver inline, open ride drawer |
| Dispatch | Maguy's dispatch board as the contractor sees it: tabs Live / Incoming / Scheduled / Arrived / Picked Up / Completed / Canceled / Open Runs with counts, Full Screen / Import / Export / Time Slot actions, Select Driver, "Drivers No Ride Scheduled in Next", Filter menu (Account Name, Patient Name, Driver, Status, Vehicle Type, Sort) with active-filter chips, Medtransport dispatch columns | Accept / Reject / Assign from the row menu, bulk Accept / Reject / Assign on checked rows |
| Schedules → Ride Request | Trip Requests (rides awaiting Accept / Reject) and Recurring Ride Request (series awaiting acceptance) | Accept / Reject one, checked rows or all; series drawer |
| Schedules → Schedule | Assigned Rides — every ride Maguy assigned, with the contractor-schedule columns (Ride ID, Date/Time, Client, Pickup → Drop-off, Driver, Vehicle, Billable Miles, Billable Amt, Commission, Pick Up Charge, Payable Amt, Billing Account, Status, Action) | Tabs All / Pending / Accepted / Assigned / In Progress / Completed / Rejected, search + filters, Accept / Reject / Assign / Remove driver, bulk actions, ride drawer (`/schedules?ride=…`) |
| Schedules → Recurring Ride | Recurring series assigned by Maguy (Medtransport "Approved Recurring Rides" columns) with a default driver per series and next-ride date | Accept / stop a series, set the default driver, series drawer with upcoming occurrences |
| Schedules → Calendar | Month grid of every assigned ride plus generated recurring occurrences; mini calendar, trip search and status toggles in the left rail | Month / year selects, day panel, open ride or series drawer |
| Ride History | Completed / rejected / cancelled with actual pickup & drop-off times | Search, filter by driver / status |
| My Drivers | Employee ID, Name, Role, Phone, Vehicle, Hire Date, Compliance, Status | Add Driver (validated form), driver drawer, toggle active, bulk set active / inactive |
| Vehicles | Fleet with ownership (Contractor-owned / Maguy-owned), inspection and insurance dates | Search, filters |
| Compliance & Documents | Company + driver documents; valid / expiring / expired / missing | Simulated upload clears the driver's flag |
| Contracts & Agreements | Service agreement, rate schedules, addenda | — (signing out of scope) |
| Pay Period Reports | Report ID, period, rides, payable amount, status | — |
| Notifications | Ride / compliance / pay / system | Mark read (one, checked or all), deep-link to ride / request |
| Profile | Business info as held by Maguy HR, dispatch preferences, portal users | — |

**Drill-down pages** (Medtransport's view / edit chrome in `src/components/pages.tsx`: sticky form
navbar with back arrow + Cancel / Save, left section nav, label / value blocks):

| Record | View | Edit |
| --- | --- | --- |
| Ride | `/schedules/rides/:id` — contractor + billing account header, patient, appointment, pickup & destination, driver & vehicle, billing, timeline, notes | `/schedules/rides/:id/edit` — Driver & Vehicle, Trip Information (odometer, actual times), Ride Status (forward-only progress), Notes to Dispatch |
| Recurring series | `/schedules/recurring-rides/:id` + upcoming occurrences | `/schedules/recurring-rides/:id/edit` — default driver / vehicle, standing instructions |
| Driver | `/drivers/:id` — personal, contact, work info, compliance, rides | `/drivers/:id/edit` |
| Vehicle | `/vehicles/:id` | `/vehicles/:id/edit`, `/vehicles/new` |
| Document | `/documents/:id` — preview placeholder, details, history | upload / replace from the page |
| Agreement | `/contracts/:id` — terms, parties, signature block | — |
| Pay period | `/pay-periods/:id` — statement totals + every completed ride in the period | — |

Patient, appointment, recurrence and billing fields are read-only everywhere: they belong to Maguy dispatch.

Every table is the same `DataTable` (`src/components/table/`): select-all / per-row checkboxes,
a bulk-action bar while rows are checked, a three-dot action menu on every row
(`TableActionDropdown`, ported from Medtransport), and the Medtransport pagination footer with
prev / next, "1-10 of 65 results" and the rows-per-page selector (5 / 10 / 20 / 30 / 50 / 100).
`/rides` redirects to `/schedules` so older deep links keep working.

Business rules enforced in `src/demo/logic.ts` (unit-tested): accept only from *pending*; reject
needs a reason and clears the driver; assign only to an *active* driver with no *expired*
compliance item and no overlapping active ride; bulk actions touch only pending rides; recurring
occurrences are generated only for accepted series and never duplicate a ride Maguy already
created; money is integer cents.

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
