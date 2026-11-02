/* Port of Medtransport `components/dashboard/utils/dropdown` TableActionDropdown + Item:
   the three-dot (vertical) trigger that opens a left-aligned menu of row actions. */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Ban,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Info,
  Mail,
  MessageCircle,
  Pencil,
  PenLine,
  Printer,
  Repeat,
  Trash2,
  Upload,
  UserMinus,
  UserPlus,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function ThreeDotVertical({ className, color = '#7F8596' }: { className?: string; color?: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn(className)}>
      <path
        d="M9.81742 13.705C10.6356 13.705 11.2989 14.3683 11.2989 15.1865C11.2989 16.0047 10.6356 16.668 9.81742 16.668C8.99922 16.668 8.33594 16.0047 8.33594 15.1865C8.33594 14.3683 8.99922 13.705 9.81742 13.705Z"
        fill={color}
      />
      <path
        d="M9.81742 8.51982C10.6356 8.51982 11.2989 9.1831 11.2989 10.0013C11.2989 10.8195 10.6356 11.4828 9.81742 11.4828C8.99922 11.4828 8.33594 10.8195 8.33594 10.0013C8.33594 9.1831 8.99922 8.51982 9.81742 8.51982Z"
        fill={color}
      />
      <path
        d="M9.81742 3.33464C10.6356 3.33464 11.2989 3.99792 11.2989 4.81612C11.2989 5.63432 10.6356 6.2976 9.81742 6.2976C8.99922 6.2976 8.33594 5.63432 8.33594 4.81612C8.33594 3.99792 8.99922 3.33464 9.81742 3.33464Z"
        fill={color}
      />
    </svg>
  );
}

export function TableActionDropdown({
  children,
  triggerButtonClassName,
  label = 'Open menu',
}: {
  children: ReactNode;
  triggerButtonClassName?: string;
  label?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={cn('h-8 w-8 p-0', triggerButtonClassName)} aria-label={label}>
          <ThreeDotVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="z-30 min-w-[169px] space-y-0.5 border-none shadow-top"
        align="start"
        side="left"
        alignOffset={4}
        sideOffset={-4}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type ActionLabel =
  | 'View'
  | 'View All'
  | 'Edit'
  | 'Delete'
  | 'Cancel'
  | 'Approve'
  | 'Accept'
  | 'Reject'
  | 'Deny'
  | 'Reschedule'
  | 'Download'
  | 'Upload'
  | 'Details'
  | 'Assign'
  | 'Reassign'
  | 'Unassign'
  | 'Documents'
  | 'Mark As Read'
  | 'History'
  | 'Print'
  | 'Email'
  | 'Chat'
  | 'Calendar'
  | 'Occurrences'
  | 'Sign';

const ICON: Record<ActionLabel, LucideIcon> = {
  View: Eye,
  'View All': Eye,
  Edit: Pencil,
  Delete: Trash2,
  Cancel: XCircle,
  Approve: CheckCircle2,
  Accept: CheckCircle2,
  Reject: Ban,
  Deny: Ban,
  Reschedule: CalendarClock,
  Download: Download,
  Upload: Upload,
  Details: Info,
  Assign: UserPlus,
  Reassign: UserPlus,
  Unassign: UserMinus,
  Documents: FileText,
  'Mark As Read': Check,
  History: Clock,
  Print: Printer,
  Email: Mail,
  Chat: MessageCircle,
  Calendar: CalendarDays,
  Occurrences: Repeat,
  Sign: PenLine,
};

export function TableActionDropdownItem({
  label,
  displayLabel,
  link,
  onSelect,
  disabled = false,
  destructive = false,
  className,
}: {
  label: ActionLabel;
  displayLabel?: string;
  link?: string;
  onSelect?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  className?: string;
}) {
  const Icon = ICON[label];
  const content = (
    <>
      <Icon className={cn('h-5 w-5', destructive ? 'text-brand-red' : 'text-primaryGray')} />
      <span>{displayLabel ?? label}</span>
    </>
  );
  const itemClassName = cn(
    'grid cursor-pointer grid-cols-[24px_1fr] items-center gap-x-2.5 text-left text-[15px] font-medium',
    destructive && 'text-brand-red focus:text-brand-red',
    className,
  );
  if (link && !disabled) {
    return (
      <DropdownMenuItem className={itemClassName} asChild>
        <Link to={link}>{content}</Link>
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuItem className={itemClassName} onSelect={onSelect} disabled={disabled}>
      {content}
    </DropdownMenuItem>
  );
}

export { DropdownMenuSeparator as TableActionDropdownSeparator };
