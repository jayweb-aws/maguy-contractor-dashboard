/* Compliance & Documents → document View page (Medtransport document view: preview + details + history). */
import { Link, Navigate, useParams } from 'react-router-dom';
import { Download, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DataViewer, FormNavbar, PageShell } from '@/components/pages';
import { ComplianceBadge, formatDateLong } from '@/components/shared';
import { useDemo } from '@/demo/store';
import { COMPLIANCE_LABEL, fullName } from '@/demo/logic';

export default function DocumentView() {
  const { id } = useParams();
  const { documents, driverById, markDocumentUploaded } = useDemo();
  const doc = documents.find((d) => d.id === id);
  if (!doc) return <Navigate to="/documents" replace />;
  const owner = doc.owner === 'company' ? undefined : driverById(doc.owner);
  const stub = (what: string) => toast(`${what} is not part of this prototype`);

  return (
    <PageShell
      nav={
        <FormNavbar
          title={
            <span className="flex items-center gap-3">
              {doc.title} <ComplianceBadge state={doc.state} />
            </span>
          }
          subTitle={`${doc.category} · ${doc.owner === 'company' ? 'Company document' : `Driver document · ${fullName(owner)}`}`}
          backTo="/documents"
          hideButtons
        >
          <Button variant="outline" onClick={() => stub('Download')} disabled={doc.state === 'missing'}>
            <Download className="h-4 w-4" /> Download
          </Button>
          <Button variant="bluish" onClick={() => markDocumentUploaded(doc.id)}>
            <Upload className="h-4 w-4" /> {doc.state === 'missing' ? 'Upload' : 'Replace'}
          </Button>
        </FormNavbar>
      }
    >
      <div className="mx-auto max-w-[1400px] grid gap-10 px-4 py-6 lg:grid-cols-[1fr_380px] lg:px-6 lg:py-8">
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-md border border-dashed border-[#E6EBF3] bg-offWhite p-6 text-center">
          <FileText className="h-12 w-12 text-primaryGray" />
          <p className="mt-3 text-sm font-medium text-headingBlack">{doc.state === 'missing' ? 'No file uploaded yet' : `${doc.title}.pdf`}</p>
          <p className="mt-1 max-w-sm text-xs text-primaryGray">
            {doc.state === 'missing'
              ? 'Upload the certificate to clear the compliance flag.'
              : 'Document preview is not part of this prototype. In the Maguy web app the PDF renders here.'}
          </p>
        </div>
        <div className="space-y-8">
          <DataViewer
            title="Document Details"
            record={[
              { label: 'Title', value: doc.title },
              { label: 'Category', value: doc.category },
              {
                label: 'Belongs to',
                value: owner ? (
                  <Link to={`/drivers/${owner.id}`} className="text-primary hover:underline">
                    {fullName(owner)}
                  </Link>
                ) : (
                  'Company'
                ),
              },
              { label: 'Status', value: COMPLIANCE_LABEL[doc.state] },
              { label: 'Uploaded', value: doc.uploadedAt ? formatDateLong(doc.uploadedAt) : '—' },
              { label: 'Expires', value: doc.expires ? formatDateLong(doc.expires) : 'No expiry' },
              { label: 'Required by', value: 'Maguy Medical Transport compliance' },
            ]}
          />
          <DataViewer
            title="History"
            record={[
              ...(doc.uploadedAt ? [{ label: formatDateLong(doc.uploadedAt), value: 'Uploaded by contractor' }] : []),
              ...(doc.state === 'expiring' && doc.expires ? [{ label: 'Reminder', value: `Expires ${formatDateLong(doc.expires)} — replace before then` }] : []),
              ...(doc.state === 'expired' && doc.expires ? [{ label: formatDateLong(doc.expires), value: 'Expired — assignment blocked until replaced' }] : []),
              ...(doc.state === 'missing' ? [{ label: 'Status', value: 'Never uploaded' }] : []),
            ]}
          />
        </div>
      </div>
    </PageShell>
  );
}
