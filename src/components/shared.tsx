/* Small building blocks shared by every page. Styling mirrors Medtransport's dashboard. */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  COMPLIANCE_LABEL,
  RIDE_STATUS_LABEL,
  complianceBadgeVariant,
  rideBadgeVariant,
} from '@/demo/logic';
import type { ComplianceState, RideStatus } from '@/demo/types';

export function RideStatusBadge({ status, className }: { status: RideStatus; className?: string }) {
  return (
    <Badge variant={rideBadgeVariant(status)} withDot className={cn('whitespace-nowrap', className)}>
      {RIDE_STATUS_LABEL[status]}
    </Badge>
  );
}

export function ComplianceBadge({ state }: { state: ComplianceState }) {
  return (
    <Badge variant={complianceBadgeVariant(state)} withDot className="whitespace-nowrap">
      {COMPLIANCE_LABEL[state]}
    </Badge>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  crumbs,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  crumbs?: { label: string; to?: string }[];
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {crumbs && crumbs.length > 0 && (
          <nav className="mb-1 flex items-center gap-1 text-xs text-primaryGray">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                {c.to ? (
                  <Link to={c.to} className="hover:text-primary">
                    {c.label}
                  </Link>
                ) : (
                  <span>{c.label}</span>
                )}
                {i < crumbs.length - 1 && <span>/</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="page-title text-headingBlack">{title}</h1>
        {description && <p className="mt-1 text-sm text-primaryGray">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  to,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'warning' | 'success' | 'danger';
  to?: string;
}) {
  const toneRing = {
    default: 'bg-primaryHoverMenu text-primary',
    warning: 'bg-[#FFFACC] text-[#726D41]',
    success: 'bg-[#DEFFCF] text-[#547544]',
    danger: 'bg-[#FFDADA] text-[#843838]',
  }[tone];
  const body = (
    <Card className="flex h-full items-start justify-between gap-3 p-4 lg:p-5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-primaryGray md:text-sm">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-headingBlack md:text-3xl">{value}</p>
        {hint && <p className="mt-1 text-xs text-primaryGray">{hint}</p>}
      </div>
      {icon && <div className={cn('flex-center h-10 w-10 shrink-0 rounded-full', toneRing)}>{icon}</div>}
    </Card>
  );
  return to ? (
    <Link to={to} className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  ) : (
    body
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn('p-0 lg:p-0', className)}>
      <div className="flex-between gap-3 border-b border-[#E6EBF3] px-4 py-3 lg:px-6">
        <h2 className="card-title text-headingBlack">{title}</h2>
        {action}
      </div>
      <div className={cn('p-4 lg:p-6', bodyClassName)}>{children}</div>
    </Card>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex-center flex-col gap-2 rounded-md border border-dashed border-[#E6EBF3] bg-offWhite px-6 py-10 text-center">
      <p className="text-sm font-medium text-headingBlack">{title}</p>
      {body && <p className="max-w-sm text-xs text-primaryGray">{body}</p>}
      {action}
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-primaryGray">{label}</span>
      <span className="text-sm text-headingBlack">{value}</span>
    </div>
  );
}

export function DemoNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-[#C7C080] bg-[#FFFACC] px-3 py-2 text-xs text-[#726D41]">{children}</p>
  );
}

export function formatDate(iso: string) {
  const [y, m, dd] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateLong(iso: string) {
  const [y, m, dd] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string) {
  const dt = new Date(iso);
  return dt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
