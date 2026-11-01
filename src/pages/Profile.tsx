/* Profile — the Independent Contractor record Maguy HR creates under HR → Employee, as the contractor sees it. */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { DemoNote, KeyValue, PageHeader, SectionCard, formatDateLong } from '@/components/shared';
import { useDemo } from '@/demo/store';
import { fullName } from '@/demo/logic';

export default function Profile() {
  const { contractor, drivers } = useDemo();

  return (
    <>
      <PageHeader
        title="Profile"
        description="Business information on file with Maguy Medical Transport. Changes are reviewed by Maguy HR."
        actions={
          <Button variant="outline-primary" size="boosted" disabled>
            Request a change
          </Button>
        }
      />
      <div className="grid min-w-0 gap-4 xl:grid-cols-3 [&>*]:min-w-0">
        <SectionCard title="Business information" className="xl:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <KeyValue label="Business name" value={contractor.businessName} />
            <KeyValue
              label="Employee type"
              value={
                <Badge variant="bluish" className="w-fit">
                  Independent Contractor
                </Badge>
              }
            />
            <KeyValue label="Primary contact" value={contractor.contactName} />
            <KeyValue label="Dispatch email" value={contractor.email} />
            <KeyValue label="Phone" value={contractor.phone} />
            <KeyValue label="Start date" value={formatDateLong(contractor.startDate)} />
            <KeyValue label="Business address" value={contractor.address} />
            <KeyValue label="EIN" value={contractor.ein} />
            <KeyValue label="NPI" value={contractor.npi ?? '—'} />
            <KeyValue
              label="Service areas"
              value={
                <span className="flex flex-wrap gap-1.5">
                  {contractor.serviceAreas.map((a) => (
                    <Badge key={a} variant="grayish">
                      {a}
                    </Badge>
                  ))}
                </span>
              }
            />
          </div>
        </SectionCard>

        <div className="flex flex-col gap-4">
          <SectionCard title="Dispatch preferences">
            <ul className="space-y-4">
              <Pref label="Email me when a ride is assigned" defaultChecked />
              <Pref label="SMS reminder 30 min before a response deadline" defaultChecked />
              <Pref label="Daily schedule summary at 6:00 AM" />
              <Pref label="Let my dispatcher-role drivers accept rides" />
            </ul>
            <p className="mt-4 text-xs text-primaryGray">Preferences are illustrative — not saved in this prototype.</p>
          </SectionCard>

          <SectionCard title="Portal users">
            <ul className="space-y-3">
              <li className="flex-between gap-3">
                <div>
                  <p className="text-sm text-headingBlack">{contractor.contactName}</p>
                  <p className="text-xs text-primaryGray">Owner · full access</p>
                </div>
                <Badge variant="greenish">Active</Badge>
              </li>
              {drivers
                .filter((d) => d.role === 'Driver / Dispatcher')
                .map((d) => (
                  <li key={d.id} className="flex-between gap-3">
                    <div>
                      <p className="text-sm text-headingBlack">{fullName(d)}</p>
                      <p className="text-xs text-primaryGray">Dispatcher · rides &amp; drivers</p>
                    </div>
                    <Badge variant="greenish">Active</Badge>
                  </li>
                ))}
            </ul>
          </SectionCard>
        </div>
      </div>
      <div className="mt-4">
        <DemoNote>
          This profile mirrors the record Maguy HR maintains under HR → Employee → Independent Contractor. Editing stays on Maguy's side.
        </DemoNote>
      </div>
      <Card className="mt-4 hidden" />
    </>
  );
}

function Pref({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <li className="flex-between gap-3">
      <span className="text-sm text-headingBlack">{label}</span>
      <Switch defaultChecked={defaultChecked} aria-label={label} />
    </li>
  );
}
