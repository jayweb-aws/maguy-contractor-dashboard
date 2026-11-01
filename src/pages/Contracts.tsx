import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DemoNote, PageHeader, formatDateLong } from '@/components/shared';
import { useDemo } from '@/demo/store';
import type { Contract } from '@/demo/types';

const STATUS: Record<Contract['status'], { label: string; variant: 'greenish' | 'yellowish' | 'grayish' }> = {
  active: { label: 'Active', variant: 'greenish' },
  'pending-signature': { label: 'Pending Signature', variant: 'yellowish' },
  expired: { label: 'Expired', variant: 'grayish' },
};

export default function Contracts() {
  const { contracts } = useDemo();
  const pending = contracts.filter((c) => c.status === 'pending-signature');

  return (
    <>
      <PageHeader
        title="Contracts & Agreements"
        description="Agreements between your company and Maguy Medical Transport. Rate schedules are set by Maguy."
      />
      {pending.length > 0 && (
        <div className="mb-4">
          <DemoNote>
            {pending.length} agreement{pending.length === 1 ? '' : 's'} waiting for your signature. Signing is not part of this prototype.
          </DemoNote>
        </div>
      )}
      <Card className="p-0 lg:p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agreement</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Effective</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Signed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((c) => (
              <TableRow key={c.id} className="text-xs md:text-sm">
                <TableCell className="font-medium text-headingBlack">
                  <span className="inline-flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primaryGray" /> {c.title}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">{c.type}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDateLong(c.effective)}</TableCell>
                <TableCell className="whitespace-nowrap">{c.expires ? formatDateLong(c.expires) : 'Ongoing'}</TableCell>
                <TableCell className="whitespace-nowrap">{c.signedAt ? formatDateLong(c.signedAt) : '—'}</TableCell>
                <TableCell>
                  <Badge variant={STATUS[c.status].variant} withDot>
                    {STATUS[c.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {c.status === 'pending-signature' ? (
                    <Button variant="bluish" disabled>
                      Review &amp; sign
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      View PDF
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
