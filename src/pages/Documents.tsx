/* Compliance & Documents — company documents + driver compliance, with a mock upload action. */
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { ComplianceBadge, DemoNote, EmptyState, PageHeader, StatCard, formatDateLong } from '@/components/shared';
import { DataTable, useTableState, type Column } from '@/components/table/DataTable';
import { TableTabsList, TableTabsTrigger } from '@/components/table/TableTabs';
import { ActiveFilters, FilterMenu, type FilterDef } from '@/components/table/FilterMenu';
import { BulkActionBar } from '@/components/table/BulkActionBar';
import { TableActionDropdownItem } from '@/components/table/TableActionDropdown';
import { useDemo } from '@/demo/store';
import { COMPLIANCE_LABEL, fullName } from '@/demo/logic';
import type { ComplianceState, Document } from '@/demo/types';

type Tab = 'all' | 'attention' | 'company' | 'driver';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'attention', label: 'Needs attention' },
  { key: 'company', label: 'Company' },
  { key: 'driver', label: 'Drivers' },
];

export default function Documents() {
  const { documents, driverById, markDocumentUploaded } = useDemo();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'all') as Tab;
  const [filters, setFilters] = useState<{ search?: string; category?: string; state?: string }>({});
  const table = useTableState(10);

  const byTab = (t: Tab) =>
    documents.filter((d) => {
      if (t === 'attention') return d.state !== 'valid';
      if (t === 'company') return d.owner === 'company';
      if (t === 'driver') return d.owner !== 'company';
      return true;
    });
  const rows = useMemo(() => {
    const needle = (filters.search ?? '').trim().toLowerCase();
    return byTab(tab)
      .filter((d) => !filters.category || d.category === filters.category)
      .filter((d) => !filters.state || d.state === filters.state)
      .filter((d) => !needle || `${d.title} ${d.category} ${d.owner === 'company' ? 'company' : fullName(driverById(d.owner))}`.toLowerCase().includes(needle))
      .sort((a, b) => rank(a.state) - rank(b.state));
  }, [documents, tab, filters, driverById]); // eslint-disable-line react-hooks/exhaustive-deps

  const setTab = (v: string) => {
    const p = new URLSearchParams(params);
    if (v === 'all') p.delete('tab');
    else p.set('tab', v);
    setParams(p, { replace: true });
    table.setPage(1);
    table.clearSelection();
  };
  const setFilter = (key: string, val: string | undefined) => {
    setFilters((f) => ({ ...f, [key]: val }));
    table.setPage(1);
  };
  const filterDefs: FilterDef[] = [
    { key: 'category', label: 'Category', options: ['Business', 'Insurance', 'Training', 'Driver'].map((c) => ({ value: c, label: c })) },
    { key: 'state', label: 'Status', options: (Object.keys(COMPLIANCE_LABEL) as ComplianceState[]).map((s) => ({ value: s, label: COMPLIANCE_LABEL[s] })) },
  ];
  const chips = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([key, value]) => ({
      key,
      label: key === 'category' ? 'Category' : key === 'state' ? 'Status' : 'Search',
      value: key === 'state' ? COMPLIANCE_LABEL[value as ComplianceState] : value!,
    }));

  const stub = (what: string) => toast(`${what} is not part of this prototype`);
  const columns: Column<Document>[] = [
    {
      id: 'title',
      header: 'Document',
      className: 'whitespace-normal',
      cell: (d) => (
        <Link to={`/documents/${d.id}`} className="font-medium text-primary hover:underline">
          {d.title}
        </Link>
      ),
    },
    { id: 'category', header: 'Category', cell: (d) => d.category },
    { id: 'owner', header: 'Belongs to', cell: (d) => (d.owner === 'company' ? 'Company' : fullName(driverById(d.owner))) },
    { id: 'uploaded', header: 'Uploaded', cell: (d) => (d.uploadedAt ? formatDateLong(d.uploadedAt) : '—') },
    { id: 'expires', header: 'Expires', cell: (d) => (d.expires ? formatDateLong(d.expires) : '—') },
    { id: 'state', header: 'Status', cell: (d) => <ComplianceBadge state={d.state} /> },
    {
      id: 'action',
      header: 'Action',
      cell: (d) =>
        d.state === 'valid' ? (
          <Button variant="link" className="h-auto p-0" asChild>
            <Link to={`/documents/${d.id}`}>View</Link>
          </Button>
        ) : (
          <Button variant="outline-primary" onClick={() => markDocumentUploaded(d.id)}>
            <Upload className="h-3.5 w-3.5" /> {d.state === 'missing' ? 'Upload' : 'Replace'}
          </Button>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Compliance & Documents"
        description="Business licenses, insurance, training and driver certifications Maguy requires to keep assigning you rides."
        actions={
          <Button variant="bluish" size="boosted" onClick={() => stub('Upload document')}>
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
        <div className="flex flex-col gap-3 px-4 pt-3 lg:px-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TableTabsList containerClassName="mb-0 md:mb-0">
              {TABS.map((t) => (
                <TableTabsTrigger key={t.key} label={t.label} value={t.key} documentCount={byTab(t.key).length} />
              ))}
            </TableTabsList>
          </Tabs>
          <div className="pb-3 lg:ml-auto lg:w-[420px]">
            <FilterMenu
              search={filters.search}
              onSearch={(q) => setFilter('search', q || undefined)}
              searchPlaceholder="Search document, driver"
              filters={filterDefs}
              value={filters}
              onChange={setFilter}
            />
          </div>
        </div>
        <ActiveFilters chips={chips} onRemove={(k) => setFilter(k, undefined)} onClearAll={() => setFilters({})} className="border-t border-[#E6EBF3] px-4 py-3 lg:px-6" />
        <BulkActionBar count={table.selected.size} onClear={table.clearSelection}>
          <Button variant="outline" className="h-8" onClick={() => stub('Download selected')}>
            Download {table.selected.size}
          </Button>
          <Button variant="outline" className="h-8" onClick={() => stub('Send reminder')}>
            Send reminder
          </Button>
        </BulkActionBar>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(d) => d.id}
          table={table}
          actions={(d) => (
            <>
              <TableActionDropdownItem label="View" link={`/documents/${d.id}`} />
              <TableActionDropdownItem label="Download" onSelect={() => stub('Download')} />
              <TableActionDropdownItem
                label="Upload"
                displayLabel={d.state === 'valid' ? 'Replace' : d.state === 'missing' ? 'Upload' : 'Replace'}
                onSelect={() => markDocumentUploaded(d.id)}
              />
            </>
          )}
          empty={<EmptyState title="Nothing here" />}
        />
      </Card>
    </>
  );
}

function rank(s: string) {
  return { expired: 0, missing: 1, expiring: 2, valid: 3 }[s] ?? 4;
}
