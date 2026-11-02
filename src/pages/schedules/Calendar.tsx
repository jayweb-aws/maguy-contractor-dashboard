/* Schedules → Calendar: every assigned ride (and generated recurring occurrence) on a month
   grid. Layout follows Medtransport's schedule-calendar: a left rail with mini calendar, trip
   search and status toggles; month / year selects above the grid. Each day shows how many rides
   it holds; clicking a day opens that day's rides in a drawer from the right. */
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Maximize2, Repeat, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { PageHeader, RideStatusBadge, formatDate } from '@/components/shared';
import { RideDetailsSheet } from '@/components/RideDetailsSheet';
import { RecurringDetailsSheet, RecurringStatusBadge } from '@/components/RecurringDetailsSheet';
import { useDemo } from '@/demo/store';
import {
  calendarEvents,
  formatMoney,
  formatTime12,
  fullName,
  isoToDate,
  monthGrid,
  type CalendarEvent,
} from '@/demo/logic';
import type { RecurringStatus, RideStatus } from '@/demo/types';
import { cn } from '@/lib/utils';

/* Medtransport schedule-calendar statusList colours */
type Group = 'pending' | 'scheduled' | 'completed' | 'cancelled';
const GROUPS: { key: Group; name: string; color: string; bg: string; border: string; text: string }[] = [
  { key: 'pending', name: 'Pending', color: 'bg-yellow-500', bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-900' },
  { key: 'scheduled', name: 'Scheduled', color: 'bg-blue-400', bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-900' },
  { key: 'completed', name: 'Completed', color: 'bg-green-500', bg: 'bg-lightGreen', border: 'border-green-500', text: 'text-green-900' },
  { key: 'cancelled', name: 'Cancelled', color: 'bg-red-400', bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-900' },
];
function groupOf(status: RideStatus | RecurringStatus, kind: CalendarEvent['kind']): Group {
  if (kind === 'recurring') return status === 'paused' ? 'pending' : 'scheduled';
  switch (status as RideStatus) {
    case 'pending':
      return 'pending';
    case 'completed':
      return 'completed';
    case 'cancelled':
    case 'rejected':
      return 'cancelled';
    default:
      return 'scheduled';
  }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
  const { rides, recurring, driverById, today } = useDemo();
  const t = isoToDate(today);
  const [year, setYear] = useState(t.getFullYear());
  const [month, setMonth] = useState(t.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [dayOpen, setDayOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<Record<Group, boolean>>({ pending: true, scheduled: true, completed: true, cancelled: true });
  const [statusOpen, setStatusOpen] = useState(true);
  const [openRide, setOpenRide] = useState<string | null>(null);
  const [openSeries, setOpenSeries] = useState<string | null>(null);

  const grid = useMemo(() => monthGrid(year, month), [year, month]);
  const from = grid[0][0];
  const to = grid[5][6];
  const events = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return calendarEvents(rides, recurring, from, to).filter((e) => {
      if (!groups[groupOf(e.status, e.kind)]) return false;
      if (!needle) return true;
      return `${e.title} ${e.subtitle} ${e.rideId ? rides.find((r) => r.id === e.rideId)?.rideNo : ''}`.toLowerCase().includes(needle);
    });
  }, [rides, recurring, from, to, groups, search]);
  const byDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [events]);
  const dayEvents = byDate.get(selectedDate) ?? [];
  const monthEvents = events.filter((e) => e.date.slice(0, 7) === `${year}-${(month + 1).toString().padStart(2, '0')}`);

  const shift = (n: number) => {
    const d = new Date(year, month + n, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const goToday = () => {
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelectedDate(today);
  };
  const years = Array.from({ length: 5 }, (_, i) => t.getFullYear() - 2 + i);
  const open = (e: CalendarEvent) => (e.rideId ? setOpenRide(e.rideId) : setOpenSeries(e.recurringId ?? null));
  const openDay = (date: string) => {
    setSelectedDate(date);
    setDayOpen(true);
  };
  const countsByGroup = (evs: CalendarEvent[]) =>
    GROUPS.map((g) => ({ ...g, n: evs.filter((e) => groupOf(e.status, e.kind) === g.key).length })).filter((g) => g.n > 0);

  return (
    <>
      <PageHeader
        title="Calendar"
        description="All rides assigned to your company, including upcoming occurrences of accepted recurring series."
        actions={
          <Button variant="icon" className="h-11 w-11 text-primary" aria-label="Full Screen" onClick={() => toast('Full screen is not part of this prototype')}>
            <Maximize2 size={16} />
          </Button>
        }
      />

      <Card className="p-0 lg:p-0">
        <div className="md:flex">
          {/* left rail */}
          <div className="shrink-0 border-b border-[#E6EBF3] md:w-[284px] md:border-b-0 md:border-r">
            <div className="space-y-4 p-4">
              <MiniMonth
                year={year}
                month={month}
                today={today}
                selected={selectedDate}
                eventDates={byDate}
                onSelect={(d) => {
                  const dt = isoToDate(d);
                  if (dt.getMonth() !== month || dt.getFullYear() !== year) {
                    setMonth(dt.getMonth());
                    setYear(dt.getFullYear());
                  }
                  openDay(d);
                }}
                onShift={shift}
              />
              <div className="relative">
                <Search className="absolute bottom-0 left-3 top-0 my-auto h-[18px] w-[18px] text-[#7F8596]" />
                <Input
                  placeholder="Search trip..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 border-[#E6EBF3] bg-[#F9FBFF] px-9"
                  aria-label="Search trip"
                />
              </div>
              <div>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-2 font-semibold text-headingBlack"
                  onClick={() => setStatusOpen((o) => !o)}
                  aria-expanded={statusOpen}
                >
                  Status
                  <ChevronDown className={cn('h-4 w-4 transition-transform', statusOpen && 'rotate-180')} />
                </button>
                {statusOpen && (
                  <div className="pl-1 pt-1">
                    {GROUPS.map((g) => (
                      <div key={g.key} className="mb-3 flex items-center space-x-3">
                        <Checkbox
                          id={`status-${g.key}`}
                          checked={groups[g.key]}
                          onCheckedChange={(c) => setGroups((s) => ({ ...s, [g.key]: c === true }))}
                        />
                        <label
                          htmlFor={`status-${g.key}`}
                          className={cn('flex h-10 w-40 cursor-pointer items-center justify-center rounded-lg border font-medium', g.bg, g.border)}
                        >
                          <span className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', g.color)} />
                            {g.name}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* month grid */}
          <div className="min-w-0 flex-grow">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6EBF3] px-4 py-3 lg:px-6">
              <div className="flex items-center gap-2">
                <Select value={month.toString()} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="w-40" aria-label="Select month">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={i.toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-24" aria-label="Select year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" className="h-9 w-9 p-0" aria-label="Previous month" onClick={() => shift(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="h-9" onClick={goToday}>
                  Today
                </Button>
                <Button variant="outline" className="h-9 w-9 p-0" aria-label="Next month" onClick={() => shift(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="ml-3 hidden text-sm text-primaryGray md:inline">
                  {monthEvents.length} ride{monthEvents.length === 1 ? '' : 's'} this month
                </span>
              </div>
            </div>

            <div className="p-3 lg:p-4">
              <div className="grid grid-cols-7 border-b border-[#E6EBF3] text-center text-xs font-medium uppercase text-primaryGray">
                {DOW.map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 border-l border-[#E6EBF3]">
                {grid.flat().map((date) => {
                  const inMonth = isoToDate(date).getMonth() === month;
                  const evs = byDate.get(date) ?? [];
                  const isToday = date === today;
                  const isSelected = date === selectedDate;
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => openDay(date)}
                      aria-label={`${formatDate(date)}, ${evs.length} rides`}
                      className={cn(
                        'flex min-h-[84px] flex-col border-b border-r border-[#E6EBF3] p-1.5 text-left align-top transition-colors hover:bg-[#F9FBFF] lg:min-h-[104px] lg:p-2',
                        !inMonth && 'bg-gray-50/60 text-primaryGray',
                        isSelected && 'bg-primary-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                          isToday ? 'bg-primary font-semibold text-white' : inMonth ? 'text-headingBlack' : 'text-primaryGray',
                        )}
                      >
                        {isoToDate(date).getDate()}
                      </span>
                      {evs.length > 0 && (
                        <div className="mt-auto flex w-full flex-col gap-1">
                          <span className="text-xl font-semibold leading-none text-headingBlack lg:text-2xl">
                            {evs.length}
                            <span className="ml-1 text-[11px] font-normal text-primaryGray">ride{evs.length === 1 ? '' : 's'}</span>
                          </span>
                          <span className="flex flex-wrap gap-1">
                            {countsByGroup(evs).map((g) => (
                              <span
                                key={g.key}
                                title={`${g.n} ${g.name.toLowerCase()}`}
                                className={cn('inline-flex h-4 min-w-4 items-center justify-center rounded-full border px-1 text-[10px] font-medium leading-none', g.bg, g.border, g.text)}
                              >
                                {g.n}
                              </span>
                            ))}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-[#E6EBF3] px-4 py-3 text-xs text-primaryGray lg:px-6">
              <span>Click a day to see its rides.</span>
              {GROUPS.map((g) => (
                <span key={g.key} className="inline-flex items-center gap-1">
                  <span className={cn('h-2 w-2 rounded-full', g.color)} /> {g.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* day drawer */}
      <Sheet open={dayOpen} onOpenChange={setDayOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="text-left">
            <SheetTitle className="text-headingBlack">{formatDate(selectedDate)}</SheetTitle>
            <SheetDescription>
              {dayEvents.length} ride{dayEvents.length === 1 ? '' : 's'} ·{' '}
              {formatMoney(dayEvents.reduce((s, e) => s + e.payableAmount, 0))} payable
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 flex flex-wrap gap-2">
            {countsByGroup(dayEvents).map((g) => (
              <span key={g.key} className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium', g.bg, g.border, g.text)}>
                <span className={cn('h-1.5 w-1.5 rounded-full', g.color)} />
                {g.n} {g.name}
              </span>
            ))}
          </div>
          {dayEvents.length === 0 ? (
            <p className="mt-5 text-sm text-primaryGray">No rides on this day.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[#E6EBF3] rounded-md border border-[#E6EBF3]">
              {dayEvents.map((e) => {
                const g = GROUPS.find((x) => x.key === groupOf(e.status, e.kind))!;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => open(e)}
                      className={cn('flex w-full items-start gap-3 border-l-4 px-3 py-3 text-left hover:bg-gray-50', g.border)}
                    >
                      <span className="w-[72px] shrink-0 pt-0.5 text-sm font-semibold text-headingBlack">{formatTime12(e.time)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm text-headingBlack">
                          <span className="truncate">{e.title}</span>
                          {e.kind === 'recurring' && (
                            <Badge variant="grayish" className="shrink-0 gap-1 px-1.5 py-0 text-[10px]">
                              <Repeat className="h-2.5 w-2.5" /> recurring
                            </Badge>
                          )}
                        </span>
                        <span className="block truncate text-xs text-primaryGray">{e.subtitle}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-primaryGray">
                          <span>{fullName(driverById(e.driverId))}</span>
                          <span>·</span>
                          <span className="font-medium text-brand-green">{formatMoney(e.payableAmount)}</span>
                        </span>
                      </span>
                      {e.kind === 'ride' ? (
                        <RideStatusBadge status={e.status as RideStatus} />
                      ) : (
                        <RecurringStatusBadge status={e.status as RecurringStatus} />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-xs text-primaryGray">Select a ride to open its details, accept / reject it or change the driver.</p>
        </SheetContent>
      </Sheet>

      <RideDetailsSheet rideId={openRide} onOpenChange={(o) => !o && setOpenRide(null)} />
      <RecurringDetailsSheet seriesId={openSeries} onOpenChange={(o) => !o && setOpenSeries(null)} />
    </>
  );
}

function MiniMonth({
  year,
  month,
  today,
  selected,
  eventDates,
  onSelect,
  onShift,
}: {
  year: number;
  month: number;
  today: string;
  selected: string;
  eventDates: Map<string, CalendarEvent[]>;
  onSelect: (d: string) => void;
  onShift: (n: number) => void;
}) {
  const grid = monthGrid(year, month);
  return (
    <div className="border-b border-[#E6EBF3] pb-4">
      <div className="flex-between mb-2">
        <button type="button" aria-label="Previous month" className="rounded p-1 hover:bg-gray-100" onClick={() => onShift(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-headingBlack">
          {MONTHS[month]} {year}
        </span>
        <button type="button" aria-label="Next month" className="rounded p-1 hover:bg-gray-100" onClick={() => onShift(1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] uppercase text-primaryGray">
        {DOW.map((d) => (
          <span key={d} className="py-1">
            {d[0]}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {grid.flat().map((date) => {
          const inMonth = isoToDate(date).getMonth() === month;
          const has = eventDates.has(date);
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                'relative mx-auto flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100',
                !inMonth && 'text-gray-300',
                date === today && 'font-semibold text-primary',
                date === selected && 'bg-primary text-white hover:bg-primary',
              )}
            >
              {isoToDate(date).getDate()}
              {has && date !== selected && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
