/* Contracts & Agreements → agreement View page: terms summary, parties and the signature block. */
import { Navigate, useParams } from 'react-router-dom';
import { Download, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataViewer, FormNavbar, PageShell } from '@/components/pages';
import { formatDateLong } from '@/components/shared';
import { useDemo } from '@/demo/store';
import type { Contract } from '@/demo/types';

const STATUS: Record<Contract['status'], { label: string; variant: 'greenish' | 'yellowish' | 'grayish' }> = {
  active: { label: 'Active', variant: 'greenish' },
  'pending-signature': { label: 'Pending Signature', variant: 'yellowish' },
  expired: { label: 'Expired', variant: 'grayish' },
};

const TERMS: Record<Contract['type'], string[]> = {
  'Service Agreement': [
    'Contractor provides non-emergency medical transportation for rides assigned by Maguy dispatch.',
    'Contractor may accept or reject each assigned ride; a reason is recorded for every rejection.',
    'Contractor assigns its own drivers and vehicles; drivers must hold current compliance documents.',
    'Maguy sets per-ride billable amounts, commission and pick-up charges on each assignment.',
    'Either party may terminate with 30 days written notice.',
  ],
  'Rate Schedule': [
    'Per-ride amounts shown on each assignment are governed by this schedule.',
    'Commission and pick-up charges are deducted before the payable amount is computed.',
    'The rate formula is confirmed by Maguy and is not reproduced in this prototype.',
  ],
  'Compliance Addendum': [
    'Contractor and its drivers handle protected health information under HIPAA.',
    'Patient details are used only to complete the assigned ride.',
    'Breaches are reported to Maguy within 24 hours.',
  ],
  NDA: ['Confidential information shared by either party stays confidential for 3 years.'],
};

export default function ContractView() {
  const { id } = useParams();
  const { contracts, contractor } = useDemo();
  const contract = contracts.find((c) => c.id === id);
  if (!contract) return <Navigate to="/contracts" replace />;
  const stub = (what: string) => toast(`${what} is not part of this prototype`);
  const s = STATUS[contract.status];

  return (
    <PageShell
      nav={
        <FormNavbar
          title={
            <span className="flex items-center gap-3">
              {contract.title}
              <Badge variant={s.variant} withDot>
                {s.label}
              </Badge>
            </span>
          }
          subTitle={`${contract.type} · effective ${formatDateLong(contract.effective)}`}
          backTo="/contracts"
          hideButtons
        >
          <Button variant="outline" onClick={() => stub('PDF download')}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          {contract.status === 'pending-signature' && (
            <Button variant="bluish" onClick={() => stub('E-signature')}>
              <PenLine className="h-4 w-4" /> Review &amp; sign
            </Button>
          )}
        </FormNavbar>
      }
    >
      <div className="mx-auto max-w-[1400px] space-y-10 px-4 py-6 lg:px-6 lg:py-8">
        <img src={logo} alt="Maguy Medical Transport" className="w-[120px]" />
        <div className="grid grid-cols-1 gap-10 border-b border-[#E6EBF3] pb-6 lg:grid-cols-2 lg:pb-10">
          <DataViewer
            title="Agreement"
            record={[
              { label: 'Title', value: contract.title },
              { label: 'Type', value: contract.type },
              { label: 'Status', value: s.label },
              { label: 'Effective', value: formatDateLong(contract.effective) },
              { label: 'Expires', value: contract.expires ? formatDateLong(contract.expires) : 'Ongoing' },
              { label: 'Signed', value: contract.signedAt ? formatDateLong(contract.signedAt) : 'Not yet signed' },
            ]}
          />
          <DataViewer
            title="Parties"
            record={[
              { label: 'Provider', value: 'Maguy Medical Transport' },
              { label: 'Contractor', value: contractor.businessName },
              { label: 'Signatory', value: contractor.contactName },
              { label: 'EIN', value: contractor.ein },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="space-y-3">
            <h6 className="text-base font-medium text-headingBlack md:text-lg">Key terms</h6>
            <ul className="list-disc space-y-2 pl-5 text-sm text-headingBlack">
              {TERMS[contract.type].map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="text-xs text-primaryGray">Summary for the prototype — the signed PDF is the agreement of record.</p>
          </div>
          <div className="space-y-3">
            <h6 className="text-base font-medium text-headingBlack md:text-lg">Signature</h6>
            <div className="rounded-md border border-[#E6EBF3] p-4">
              {contract.signedAt ? (
                <>
                  <p className="font-serif text-2xl italic text-headingBlack">{contractor.contactName}</p>
                  <p className="mt-2 text-xs text-primaryGray">
                    Signed electronically by {contractor.contactName} on {formatDateLong(contract.signedAt)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-headingBlack">Awaiting your signature.</p>
                  <p className="mt-1 text-xs text-primaryGray">E-signature is not part of this prototype.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
