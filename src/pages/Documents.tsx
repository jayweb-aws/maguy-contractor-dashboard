/* Compliance & Documents — company documents + driver compliance, with a mock upload action. */
import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ComplianceBadge, DemoNote, EmptyState, PageHeader, StatCard, formatDateLong } from '@/components/shared';
import { useDemo } from '@/demo/store';
import { fullName } from '@/demo/logic';

type Tab = 'all' | 'attention' | 'company' | 'driver';

export default function Documents() {
  const { documents, driverById, markDocumentUploaded } = useDemo();
  const [tab, setTab] = useState<Tab>('all');

  const attention = documents.filter((d) => d.state !== 'valid');
  const visible = documents
    .filter((d) => {
      if (tab === 'attention') return d.state !== 'valid';
      if (tab === 'company') return d.owner === 'company';
      if (tab === 'driver') return d.owner !== 'company';
      return true;
    })
    .sort((a, b) => rank(a.state) - rank(b.state));

  return (
    <>
      <PageHeader
        title="Compliance & Documents"
        description="Business licenses, insurance, training and driver certifications Maguy requires to keep assigning you rides."
        actions={
          <Button variant="bluish" size="boosted" disabled>
            <Upload className="h-4 w-4" /> Upload document
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="Documents on file" value={documents.filter((d) => d.state !== 'missing').length} />
        <StatCard label="Expiring ≤ 30 days" value={documents.filter((d) => d.state === 'expiring').length} tone="warning" />
        <StatCard label="Expired" value={documents.filter((d) => d.state === 'expired').length} tone="danger" />
        <StatCard label="Missing" value={documents.filter((d) => d.state === 'missing').length} />
      </div>

      <div className="mt-4">
        <DemoNote>
          Upload is simulated in this prototype: “Replace” marks the document valid for 12 months and clears the driver's compliance flag.
        </DemoNote>
      </div>

      <Card className="mt-4 p-0 lg:p-0">
        <div className="border-b border-[#E6EBF3] px-4 pt-3 lg:px-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="gap-4">
              <TabsTrigger value="all">All ({documents.length})</TabsTrigger>
              <TabsTrigger value="attention">Needs attention ({attention.length})</TabsTrigger>
              <TabsTrigger value="company">Company</TabsTrigger>
              <TabsTrigger value="driver">Drivers</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {visible.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Nothing here" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Belongs to</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((d) => (
                <TableRow key={d.id} className="text-xs md:text-sm">
                  <TableCell className="font-medium text-headingBlack">{d.title}</TableCell>
                  <TableCell>{d.category}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {d.owner === 'company' ? 'Company' : fullName(driverById(d.owner))}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{d.uploadedAt ? formatDateLong(d.uploadedAt) : '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{d.expires ? formatDateLong(d.expires) : '—'}</TableCell>
                  <TableCell>
                    <ComplianceBadge state={d.state} />
                  </TableCell>
                  <TableCell>
                    {d.state === 'valid' ? (
                      <Button variant="link" className="h-auto p-0" disabled>
                        View
                      </Button>
                    ) : (
                      <Button variant="outline-primary" onClick={() => markDocumentUploaded(d.id)}>
                        <Upload className="h-3.5 w-3.5" /> {d.state === 'missing' ? 'Upload' : 'Replace'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}

function rank(s: string) {
  return { expired: 0, missing: 1, expiring: 2, valid: 3 }[s] ?? 4;
}
