/* Chrome for the drill-down View / Edit pages, ported from Medtransport:
   - FormNavbar  → `universal-edit-forms/Headers` IndividualFormNavbar (sticky, back arrow, Cancel / Save)
   - SectionNav  → `universal-edit-forms/Sidebar` (88px rows, active = #F1F6FF + primary right border)
   - DataViewer  → ViewDispatch's InvoiceDataViewer (section title + label / value rows)        */
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function FormNavbar({
  title,
  subTitle,
  backTo,
  onSubmit,
  onCancel,
  submitText = 'Save',
  submitVariant = 'bluish',
  isSubmissionDisabled,
  hideButtons,
  children,
}: {
  title: ReactNode;
  subTitle?: ReactNode;
  backTo?: string;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitText?: string;
  submitVariant?: 'bluish' | 'outline-greenish' | 'outline-reddish';
  isSubmissionDisabled?: boolean;
  hideButtons?: boolean;
  /** extra actions (View pages: Edit / Accept / Download …) */
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  const back = () => (backTo ? navigate(backTo) : navigate(-1));
  return (
    <div className="sticky top-[64px] z-20 flex min-h-[88px] flex-wrap items-center justify-between gap-4 border-b border-[#E6EBF3] bg-white px-4 py-2 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button onClick={back} variant="whitish" className="shrink-0 border-[#EFEFEF] px-2.5" aria-label="Back">
          <ArrowLeft className="h-4 w-4 text-primaryBlack" />
        </Button>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-headingBlack md:text-xl">{title}</h3>
          {subTitle && <p className="truncate text-xs text-primaryGray">{subTitle}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {!hideButtons && (
          <>
            <Button variant="whitish" onClick={onCancel ?? back}>
              Cancel
            </Button>
            <Button variant={submitVariant} onClick={onSubmit} disabled={isSubmissionDisabled} className="min-w-[100px]">
              <CircleCheck className="h-4 w-4" /> {submitText}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** Card that holds a FormNavbar + body, like Medtransport's edit / view wrappers.
 *  No `overflow-hidden` here: it would turn the card into the sticky navbar's scroll container
 *  and push the navbar down by its `top` offset. */
export function PageShell({ nav, children, className }: { nav: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('p-0 lg:p-0 [&>*:first-child]:rounded-t-lg', className)}>
      {nav}
      {children}
    </Card>
  );
}

export interface SectionItem {
  key: string;
  label: string;
  count?: number;
}

/** Left column of section links (Medtransport edit forms) — state driven, no routes needed. */
export function SectionNav({
  items,
  current,
  onChange,
}: {
  items: SectionItem[];
  current: string;
  onChange: (key: string) => void;
}) {
  return (
    <aside className="border-b border-[#E6EBF3] lg:sticky lg:top-[152px] lg:min-h-[calc(100vh-152px)] lg:self-start lg:border-b-0 lg:border-r">
      <div className="card-title hidden h-[84px] items-center border-b border-[#E6EBF3] px-6 text-headingBlack lg:flex">Sections</div>
      <nav className="flex overflow-x-auto lg:block">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            aria-current={current === it.key ? 'page' : undefined}
            className={cn(
              'flex h-[56px] shrink-0 items-center justify-between gap-3 whitespace-nowrap border-t border-[#E6EBF3] px-4 text-sm font-medium transition-all hover:bg-gray-100 lg:h-[72px] lg:w-full',
              current === it.key ? 'bg-[#F1F6FF] text-primary lg:border-r lg:border-r-primary' : 'text-headingBlack',
            )}
          >
            {it.label}
            {it.count !== undefined && (
              <span className="rounded-md bg-secondary px-1.5 text-[10px] text-primaryBlue">{it.count}</span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}

/** Two-column body: SectionNav on the left, content on the right. */
export function SectionLayout({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className="lg:grid lg:grid-cols-[260px_1fr]">
      {nav}
      <div className="min-w-0 p-4 lg:p-6">{children}</div>
    </div>
  );
}

export interface DataRecord {
  label: string;
  value: ReactNode;
}

export function DataViewer({ title, record, className }: { title?: ReactNode; record: DataRecord[]; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {title && <h6 className="text-base font-medium text-headingBlack md:text-lg">{title}</h6>}
      <dl className="divide-y divide-[#F1F3F7]">
        {record.map((r, i) => (
          <div key={i} className="grid grid-cols-[150px_1fr] gap-3 py-2 text-sm md:grid-cols-[200px_1fr]">
            <dt className="text-primaryGray">{r.label}</dt>
            <dd className="min-w-0 break-words text-headingBlack">{r.value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function FormSectionHeader({ title, subTitle }: { title: string; subTitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-medium text-headingBlack">{title}</h2>
      {subTitle && <p className="text-[12px] text-[#8A8F96]">{subTitle}</p>}
    </div>
  );
}

/** Medtransport FormColumnLayout: two columns of fields on desktop. */
export function FormColumns({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-x-6 gap-y-5 md:grid-cols-2', className)}>{children}</div>;
}

export function Field({
  label,
  error,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-sm text-headingBlack">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-brand-red">{error}</p> : hint ? <p className="text-xs text-primaryGray">{hint}</p> : null}
    </div>
  );
}

export function ReadOnlyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-[#E6EBF3] bg-offWhite px-3 py-2 text-xs text-primaryGray">{children}</p>;
}
