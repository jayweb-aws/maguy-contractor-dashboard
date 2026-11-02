/* Accept / Reject / Assign controls used by the dashboard, ride table and ride drawer. */
import { useMemo, useState } from 'react';
import { Check, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { TableActionDropdownItem } from '@/components/table/TableActionDropdown';
import { useDemo } from '@/demo/store';
import {
  availableDrivers,
  canAccept,
  canAssignDriver,
  canReject,
  driverCanBeAssigned,
  fullName,
  worstCompliance,
} from '@/demo/logic';
import type { Ride } from '@/demo/types';

const REJECT_REASONS = [
  'No driver available in that window',
  'No suitable vehicle (wheelchair / stretcher)',
  'Outside our service area',
  'Pickup time conflicts with an existing ride',
  'Other',
];

export function RejectDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const finalReason = reason === 'Other' ? detail.trim() : reason;
  const valid = finalReason.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setReason('');
          setDetail('');
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reject-reason" aria-label="Reject reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REJECT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {reason === 'Other' && (
            <div className="space-y-1.5">
              <Label htmlFor="reject-detail">Details</Label>
              <Textarea
                id="reject-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Tell dispatch why this ride can't be covered"
                rows={3}
              />
            </div>
          )}
          <p className="text-xs text-primaryGray">
            Maguy dispatch sees this reason and reassigns the ride. Rejections count toward your acceptance rate.
          </p>
        </div>
        <DialogFooter>
          <Button variant="whitish" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="redish"
            disabled={!valid}
            onClick={() => {
              onConfirm(finalReason);
              onOpenChange(false);
            }}
          >
            Reject ride
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssignDriverSelect({ ride, size = 'default' }: { ride: Ride; size?: 'default' | 'boosted' }) {
  const { drivers, rides, assign, unassign } = useDemo();
  const free = useMemo(() => availableDrivers(drivers, rides, ride), [drivers, rides, ride]);
  const freeIds = new Set(free.map((d) => d.id));
  const current = ride.driverId ?? '';

  if (!canAssignDriver(ride)) return null;

  return (
    <Select
      value={current}
      onValueChange={(v) => {
        if (v === '__unassign') unassign(ride.id);
        else assign(ride.id, v);
      }}
    >
      <SelectTrigger
        aria-label={`Assign driver for ${ride.rideNo}`}
        className={size === 'boosted' ? 'h-10 w-full' : 'h-8 w-[180px] text-xs'}
      >
        <SelectValue placeholder="Select driver" />
      </SelectTrigger>
      <SelectContent>
        {drivers
          .filter((d) => d.status === 'active')
          .map((d) => {
            const blocked = !driverCanBeAssigned(d);
            const busy = !freeIds.has(d.id) && d.id !== current;
            const label = blocked
              ? `${fullName(d)} — ${worstCompliance(d.compliance)} compliance`
              : busy
                ? `${fullName(d)} — busy at this time`
                : fullName(d);
            return (
              <SelectItem key={d.id} value={d.id} disabled={blocked || busy}>
                {label}
              </SelectItem>
            );
          })}
        {current && (
          <SelectItem value="__unassign" className="text-brand-red">
            Remove driver
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

/** Items for the three-dot menu on any ride row. The reject dialog and the details drawer live
 *  on the page (a dialog mounted inside a closing menu would unmount), so they are callbacks. */
export function RideMenuItems({
  ride,
  onView,
  onReject,
}: {
  ride: Ride;
  onView: (rideId: string) => void;
  onReject: (ride: Ride) => void;
}) {
  const { accept, unassign } = useDemo();
  const defer = (fn: () => void) => setTimeout(fn, 0);
  return (
    <>
      <TableActionDropdownItem label="View" onSelect={() => defer(() => onView(ride.id))} />
      {canAccept(ride) && <TableActionDropdownItem label="Accept" onSelect={() => accept(ride.id)} />}
      {canAssignDriver(ride) && !ride.driverId && (
        <TableActionDropdownItem label="Assign" displayLabel="Assign Driver" onSelect={() => defer(() => onView(ride.id))} />
      )}
      {canAssignDriver(ride) && ride.driverId && (
        <TableActionDropdownItem label="Reassign" displayLabel="Change Driver" onSelect={() => defer(() => onView(ride.id))} />
      )}
      {ride.status === 'assigned' && (
        <TableActionDropdownItem label="Unassign" displayLabel="Remove Driver" onSelect={() => unassign(ride.id)} />
      )}
      {canReject(ride) && (
        <TableActionDropdownItem label="Reject" destructive onSelect={() => defer(() => onReject(ride))} />
      )}
    </>
  );
}

export function RideRowActions({ ride, compact = false }: { ride: Ride; compact?: boolean }) {
  const { accept, reject } = useDemo();
  const [rejecting, setRejecting] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {canAccept(ride) && (
        <Button
          variant="greenish"
          size={compact ? 'default' : 'boosted'}
          onClick={() => accept(ride.id)}
          aria-label={`Accept ${ride.rideNo}`}
        >
          <Check className="h-4 w-4" /> Accept
        </Button>
      )}
      {canAssignDriver(ride) && !ride.driverId && (
        <span className="hidden items-center gap-1 text-xs text-primaryGray lg:inline-flex">
          <UserPlus className="h-3.5 w-3.5" /> Needs driver
        </span>
      )}
      {canReject(ride) && (
        <Button
          variant="outline-reddish"
          size={compact ? 'default' : 'boosted'}
          onClick={() => setRejecting(true)}
          aria-label={`Reject ${ride.rideNo}`}
        >
          <X className="h-4 w-4" /> Reject
        </Button>
      )}
      <RejectDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={`Reject ride ${ride.rideNo}?`}
        description={`${ride.patient.name} · ${ride.pickup}`}
        onConfirm={(reason) => reject(ride.id, reason)}
      />
    </div>
  );
}
