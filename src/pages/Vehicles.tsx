import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader, StatCard, formatDateLong } from '@/components/shared';
import { useDemo } from '@/demo/store';
import { fullName } from '@/demo/logic';
import type { Vehicle } from '@/demo/types';

const STATUS: Record<Vehicle['status'], { label: string; variant: 'greenish' | 'yellowish' | 'grayish' }> = {
  active: { label: 'Active', variant: 'greenish' },
  maintenance: { label: 'In Maintenance', variant: 'yellowish' },
  inactive: { label: 'Inactive', variant: 'grayish' },
};

export default function Vehicles() {
  const { vehicles, driverById, today } = useDemo();
  const overdue = vehicles.filter((v) => v.inspectionDue < today).length;
  const soon = vehicles.filter((v) => v.inspectionDue >= today && daysBetween(today, v.inspectionDue) <= 30).length;

  return (
    <>
      <PageHeader
        title="Vehicles"
        description="Vehicles your drivers operate. Ownership determines who carries insurance and maintenance."
      />
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="Fleet size" value={vehicles.length} />
        <StatCard label="Contractor-owned" value={vehicles.filter((v) => v.ownership === 'Contractor-owned').length} />
        <StatCard label="Inspection due ≤ 30 days" value={soon} tone={soon > 0 ? 'warning' : 'default'} />
        <StatCard label="Inspection overdue" value={overdue} tone={overdue > 0 ? 'danger' : 'default'} />
      </div>

      <Card className="mt-4 p-0 lg:p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Plate</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Ownership</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead className="whitespace-nowrap">Inspection Due</TableHead>
              <TableHead className="whitespace-nowrap">Insurance Expires</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((v) => {
              const inspOverdue = v.inspectionDue < today;
              return (
                <TableRow key={v.id} className="text-xs md:text-sm">
                  <TableCell className="whitespace-nowrap font-medium text-headingBlack">{v.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{v.plate}</TableCell>
                  <TableCell className="whitespace-nowrap">{v.type}</TableCell>
                  <TableCell className="whitespace-nowrap text-primaryGray">{v.capacity}</TableCell>
                  <TableCell>
                    <Badge variant={v.ownership === 'Maguy-owned' ? 'bluish' : 'grayish'} className="whitespace-nowrap">
                      {v.ownership}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{fullName(driverById(v.driverId))}</TableCell>
                  <TableCell className={`whitespace-nowrap ${inspOverdue ? 'font-medium text-brand-red' : ''}`}>
                    {formatDateLong(v.inspectionDue)}
                    {inspOverdue && <span className="block text-[11px]">Overdue</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateLong(v.insuranceExpires)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS[v.status].variant} withDot>
                      {STATUS[v.status].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}
