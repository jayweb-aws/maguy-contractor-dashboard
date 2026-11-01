/* Pay Period Reports — Medtransport "pay-period-reports" columns + a simple trend chart. */
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DemoNote, PageHeader, SectionCard, StatCard, formatDateLong } from '@/components/shared';
import { useDemo } from '@/demo/store';
import { formatMoney } from '@/demo/logic';
import type { PayPeriod } from '@/demo/types';

const STATUS: Record<PayPeriod['status'], { label: string; variant: 'bluish' | 'yellowish' | 'greenish' | 'grayish' }> = {
  open: { label: 'Open', variant: 'bluish' },
  submitted: { label: 'Submitted', variant: 'yellowish' },
  approved: { label: 'Approved', variant: 'greenish' },
  paid: { label: 'Paid', variant: 'grayish' },
};

export default function PayPeriods() {
  const { payPeriods } = useDemo();
  const open = payPeriods.find((p) => p.status === 'open');
  const awaiting = payPeriods.filter((p) => p.status === 'submitted' || p.status === 'approved');
  const paidYtd = payPeriods.filter((p) => p.status === 'paid').reduce((s, p) => s + p.payableAmount, 0);
  const chart = [...payPeriods].reverse().map((p) => ({ name: p.reportId.replace('PPR-2026-', 'PP '), payable: p.payableAmount / 100, rides: p.rides }));

  return (
    <>
      <PageHeader
        title="Pay Period Reports"
        description="Bi-weekly statements of the rides you completed and the amount payable to your company."
      />
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="Current period (open)" value={open ? formatMoney(open.payableAmount) : '—'} hint={open ? `${open.rides} rides so far` : undefined} />
        <StatCard label="Awaiting payment" value={formatMoney(awaiting.reduce((s, p) => s + p.payableAmount, 0))} hint={`${awaiting.length} report${awaiting.length === 1 ? '' : 's'}`} tone="warning" />
        <StatCard label="Paid (last 3 periods)" value={formatMoney(paidYtd)} tone="success" />
        <StatCard label="Avg rides / period" value={Math.round(payPeriods.reduce((s, p) => s + p.rides, 0) / payPeriods.length)} />
      </div>

      <div className="mt-4">
        <DemoNote>
          Figures are sample values. The rate / commission formula behind “Payable Amount” has not been confirmed by Maguy and is not computed here.
        </DemoNote>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-3 [&>*]:min-w-0">
        <SectionCard title="Payable by period" className="xl:col-span-1" bodyClassName="p-2 lg:p-3">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#E6EBF3" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#7F8596' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#7F8596' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                <Tooltip
                  cursor={{ fill: '#F1F6FF' }}
                  formatter={(v: number) => [`$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Payable']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E6EBF3', fontSize: 12 }}
                />
                <Bar dataKey="payable" fill="#0062FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <Card className="p-0 lg:p-0 xl:col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Report ID</TableHead>
                <TableHead className="whitespace-nowrap">Pay Period Start</TableHead>
                <TableHead className="whitespace-nowrap">Pay Period End</TableHead>
                <TableHead className="text-right">Rides</TableHead>
                <TableHead className="whitespace-nowrap text-right">Payable Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payPeriods.map((p) => (
                <TableRow key={p.id} className="text-xs md:text-sm">
                  <TableCell className="whitespace-nowrap font-medium text-primary">{p.reportId}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateLong(p.start)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateLong(p.end)}</TableCell>
                  <TableCell className="text-right">{p.rides}</TableCell>
                  <TableCell className="text-right font-medium text-headingBlack">{formatMoney(p.payableAmount)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS[p.status].variant} withDot>
                      {STATUS[p.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" disabled>
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}
