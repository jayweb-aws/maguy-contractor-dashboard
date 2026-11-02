/* Pay Period Reports → statement View page: totals plus every completed ride in the period. */
import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataViewer, FormNavbar, PageShell } from '@/components/pages';
import { RideStatusBadge, formatDate, formatDateLong } from '@/components/shared';
import { DataTable, useTableState, type Column } from '@/components/table/DataTable';
import { TableActionDropdownItem } from '@/components/table/TableActionDropdown';
import { useDemo } from '@/demo/store';
import { formatMoney, formatTime12, fullName, ridesInPeriod } from '@/demo/logic';
import type { PayPeriod, Ride } from '@/demo/types';

const STATUS: Record<PayPeriod['status'], { label: string; variant: 'bluish' | 'yellowish' | 'greenish' | 'grayish' }> = {
  open: { label: 'Open', variant: 'bluish' },
  submitted: { label: 'Submitted', variant: 'yellowish' },
  approved: { label: 'Approved', variant: 'greenish' },
  paid: { label: 'Paid', variant: 'grayish' },
};

export default function PayPeriodView() {
  const { id } = useParams();
  const { payPeriods, rides, driverById, contractor } = useDemo();
  const table = useTableState(10);
  const report = payPeriods.find((p) => p.id === id);
  const rows = useMemo(() => (report ? ridesInPeriod(rides, report.start, report.end) : []), [rides, report]);
  if (!report) return <Navigate to="/pay-periods" replace />;
  const stub = (what: string) => toast(`${what} is not part of this prototype`);

  const billable = rows.reduce((s, r) => s + r.billableAmount, 0);
  const pickup = rows.reduce((s, r) => s + r.pickUpCharge, 0);
  const payable = rows.reduce((s, r) => s + r.payableAmount, 0);
  const miles = rows.reduce((s, r) => s + r.billableMiles, 0);

  const columns: Column<Ride>[] = [
    {
      id: 'rideNo',
      header: 'Ride ID',
      cell: (r) => (
        <Link to={`/schedules/rides/${r.id}`} className="font-medium text-primary hover:underline">
          {r.rideNo}
        </Link>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      cell: (r) => (
        <>
          {formatDate(r.date)}
          <p className="text-primaryGray">{formatTime12(r.pickupTime)}</p>
        </>
      ),
    },
    { id: 'patient', header: 'Patient', cell: (r) => r.patient.name },
    { id: 'driver', header: 'Driver', cell: (r) => fullName(driverById(r.driverId)) },
    { id: 'account', header: 'Billing Account', cell: (r) => r.billingAccount },
    { id: 'miles', header: 'Miles', headClassName: 'text-right', className: 'text-right', cell: (r) => r.billableMiles.toFixed(1) },
    { id: 'billable', header: 'Billable', headClassName: 'text-right', className: 'text-right', cell: (r) => formatMoney(r.billableAmount) },
    { id: 'commission', header: 'Commission', headClassName: 'text-right', className: 'text-right', cell: (r) => `${r.commissionPct}%` },
    { id: 'pickup', header: 'Pick Up Charge', headClassName: 'text-right', className: 'text-right', cell: (r) => formatMoney(r.pickUpCharge) },
    { id: 'payable', header: 'Payable', headClassName: 'text-right', className: 'text-right font-medium text-brand-green', cell: (r) => formatMoney(r.payableAmount) },
    { id: 'status', header: 'Status', cell: (r) => <RideStatusBadge status={r.status} /> },
  ];

  return (
    <PageShell
      nav={
        <FormNavbar
          title={
            <span className="flex items-center gap-3">
              {report.reportId}
              <Badge variant={STATUS[report.status].variant} withDot>
                {STATUS[report.status].label}
              </Badge>
            </span>
          }
          subTitle={`Pay period ${formatDateLong(report.start)} – ${formatDateLong(report.end)}`}
          backTo="/pay-periods"
          hideButtons
        >
          <Button variant="outline" onClick={() => stub('Statement download')}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </FormNavbar>
      }
    >
      <div className="mx-auto max-w-[1400px] space-y-10 px-4 py-6 lg:px-6 lg:py-8">
        <div className="grid grid-cols-1 gap-10 border-b border-[#E6EBF3] pb-6 lg:grid-cols-[auto_1fr_1fr] lg:gap-16 lg:pb-10">
          <img src={logo} alt="Maguy Medical Transport" className="w-[120px]" />
          <DataViewer
            title="Statement"
            record={[
              { label: 'Report ID', value: report.reportId },
              { label: 'Pay period start', value: formatDateLong(report.start) },
              { label: 'Pay period end', value: formatDateLong(report.end) },
              { label: 'Status', value: STATUS[report.status].label },
              { label: 'Payee', value: contractor.businessName },
            ]}
          />
          <DataViewer
            title="Totals"
            record={[
              { label: 'Completed rides', value: rows.length },
              { label: 'Billable miles', value: miles.toFixed(1) },
              { label: 'Billable amount', value: formatMoney(billable) },
              { label: 'Pick up charges', value: formatMoney(pickup) },
              { label: 'Payable to you', value: <span className="text-lg font-semibold text-brand-green">{formatMoney(payable)}</span> },
            ]}
          />
        </div>
        <p className="text-xs text-primaryGray">Per-ride amounts are sample values set by Maguy dispatch; totals are the sum of the rides below.</p>
        <div className="-mx-4 lg:-mx-6">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            table={table}
            actions={(r) => (
              <>
                <TableActionDropdownItem label="View" link={`/schedules/rides/${r.id}`} />
                <TableActionDropdownItem label="Download" displayLabel="Trip Report (PDF)" onSelect={() => stub('Trip report download')} />
              </>
            )}
            empty={<p className="text-center text-sm text-primaryGray">No completed rides in this period yet.</p>}
          />
        </div>
      </div>
    </PageShell>
  );
}
