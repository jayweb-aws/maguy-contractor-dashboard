/* Shell: white 260px sidebar + sticky white topbar + gray body — Medtransport's dashboard chrome.
   "Schedules" is a dropdown group rendered like Medtransport's SidebarDropdown (chevron, nested
   list with the L-shaped connector). */
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  Car,
  ChevronDown,
  FileSignature,
  FolderOpen,
  History,
  LayoutDashboard,
  Menu,
  Radio,
  Receipt,
  RotateCcw,
  UserCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDemo } from '@/demo/store';
import { cn } from '@/lib/utils';

type BadgeKind = 'unread' | 'incoming' | 'requests';

interface NavLeaf {
  label: string;
  to: string;
  icon?: LucideIcon;
  end?: boolean;
  badge?: BadgeKind;
}
interface NavGroup {
  label: string;
  icon: LucideIcon;
  /** pathname prefix that marks the group active */
  prefix: string;
  children: NavLeaf[];
}
type NavItem = NavLeaf | NavGroup;

const NAV: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Dispatch', to: '/dispatch', icon: Radio, badge: 'incoming' },
  {
    label: 'Schedules',
    icon: CalendarDays,
    prefix: '/schedules',
    children: [
      { label: 'Ride Request', to: '/schedules/ride-request', badge: 'requests' },
      { label: 'Schedule', to: '/schedules', end: true },
      { label: 'Recurring Ride', to: '/schedules/recurring-rides' },
      { label: 'Calendar', to: '/schedules/calendar' },
    ],
  },
  { label: 'Ride History', to: '/history', icon: History },
  { label: 'My Drivers', to: '/drivers', icon: Users },
  { label: 'Vehicles', to: '/vehicles', icon: Car },
  { label: 'Compliance & Documents', to: '/documents', icon: FolderOpen },
  { label: 'Contracts & Agreements', to: '/contracts', icon: FileSignature },
  { label: 'Pay Period Reports', to: '/pay-periods', icon: Receipt },
  { label: 'Notifications', to: '/notifications', icon: Bell, badge: 'unread' },
  { label: 'Profile', to: '/profile', icon: UserCircle },
];

const isGroup = (n: NavItem): n is NavGroup => 'children' in n;

function leafMatches(leaf: NavLeaf, pathname: string) {
  return leaf.end || leaf.to === '/' ? pathname === leaf.to : pathname.startsWith(leaf.to);
}

/** Longest-prefix match so "/schedules/calendar" wins over "/schedules". */
function currentLeaf(pathname: string): NavLeaf | undefined {
  const leaves: NavLeaf[] = NAV.flatMap((n) => (isGroup(n) ? n.children : [n]));
  return leaves
    .filter((l) => leafMatches(l, pathname))
    .sort((a, b) => b.to.length - a.to.length)[0];
}

export function DashboardLayout() {
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop rail
  const { contractor, unread, resetDemo, rides, recurring } = useDemo();
  const location = useLocation();
  const navigate = useNavigate();
  const current = currentLeaf(location.pathname);
  const activeGroup = NAV.find((n) => isGroup(n) && location.pathname.startsWith(n.prefix)) as NavGroup | undefined;
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup?.label ?? null);

  useEffect(() => {
    if (activeGroup) setOpenGroup(activeGroup.label);
  }, [activeGroup]);

  const incoming = rides.filter((r) => r.status === 'pending').length;
  const requests = incoming + recurring.filter((s) => s.status === 'pending').length;
  const badgeValue = (kind?: BadgeKind) =>
    kind === 'unread' ? unread : kind === 'incoming' ? incoming : kind === 'requests' ? requests : 0;
  const badgeClass = (kind?: BadgeKind) =>
    kind === 'unread'
      ? 'bg-[#F1F6FF] text-primary'
      : 'bg-[#FFFACC] text-[#726D41]';

  const CountBadge = ({ kind }: { kind?: BadgeKind }) => {
    const n = badgeValue(kind);
    if (!kind || n === 0) return null;
    return (
      <span className={cn('count flex-center h-5 min-w-5 rounded-full px-1.5 text-[11px] font-semibold', badgeClass(kind))}>
        {n > 99 ? '99+' : n}
      </span>
    );
  };

  const leafLink = (leaf: NavLeaf, nested = false) => {
    const Icon = leaf.icon;
    return (
      <NavLink
        to={leaf.to}
        end={leaf.end}
        onClick={() => setOpen(false)}
        className={({ isActive }) =>
          nested
            ? cn(
                'relative flex items-center justify-between py-0.5 text-sm transition-all before:absolute before:-left-6 before:bottom-2 before:h-[34px] before:w-[18px] before:rounded-bl-lg before:border-b-2 before:border-l-2 before:border-[#E6EBF3] hover:text-primary',
                isActive ? 'font-medium text-primary' : 'text-primaryGray',
              )
            : cn(
                'flex items-center gap-3 rounded-md px-[1.1rem] py-[0.7rem] text-sm font-medium transition-colors',
                isActive ? 'bg-[#F1F6FF] text-brand-deep-blue' : 'text-sidebarGray hover:bg-[#F1F6FF]/70 hover:text-headingBlack',
              )
        }
      >
        {Icon && <Icon className="h-5 w-5 shrink-0" />}
        <span className="flex-1 truncate">{leaf.label}</span>
        <CountBadge kind={leaf.badge} />
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* mobile backdrop */}
      {open && (
        <button aria-label="Close menu" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={cn(
          'dashboard-sidebar fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-[#E6EBF3] bg-white transition-all duration-200',
          !open && 'max-lg:-translate-x-full',
          collapsed && 'hide group',
        )}
      >
        <div className="flex h-[64px] items-center gap-3 px-5">
          <img src={logo} alt="Maguy Medical Transport" className="w-[80px] shrink-0" />
        </div>
        <div className="px-5 pb-3">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-primaryGray">
            <span>Contractor Portal</span>
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-1">
            {NAV.map((item) => {
              if (!isGroup(item)) return <li key={item.to}>{leafLink(item)}</li>;
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.prefix);
              const expanded = openGroup === item.label && !collapsed;
              const groupBadge = item.children.reduce((s, c) => s + badgeValue(c.badge), 0);
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`nav-group-${item.prefix.slice(1)}`}
                    onClick={() => {
                      if (collapsed) {
                        navigate(item.children[0].to);
                        return;
                      }
                      setOpenGroup((g) => (g === item.label ? null : item.label));
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-[1.1rem] py-[0.7rem] text-sm font-medium transition-colors',
                      active ? 'bg-[#F1F6FF] text-brand-deep-blue' : 'text-sidebarGray hover:bg-[#F1F6FF]/70 hover:text-headingBlack',
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    {!expanded && groupBadge > 0 && (
                      <span className="count flex-center h-5 min-w-5 rounded-full bg-[#FFFACC] px-1.5 text-[11px] font-semibold text-[#726D41]">
                        {groupBadge}
                      </span>
                    )}
                    <ChevronDown className={cn('count h-4 w-4 shrink-0 transition-transform', expanded && 'rotate-180')} />
                  </button>
                  <ul
                    id={`nav-group-${item.prefix.slice(1)}`}
                    className={cn('mt-2 space-y-3 pb-2 pl-12 pr-2', !expanded && 'hidden')}
                  >
                    {item.children.map((c) => (
                      <li key={c.to}>{leafLink(c, true)}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-[#E6EBF3] p-3">
          <Button variant="whitish" className="w-full justify-start gap-3 px-[1.1rem]" onClick={resetDemo}>
            <RotateCcw className="h-4 w-4 shrink-0" />
            <span>Reset demo data</span>
          </Button>
        </div>
      </aside>

      <div className={cn('dashboard-body flex min-h-screen flex-col transition-all duration-200', collapsed && 'active')}>
        <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between bg-white px-4 shadow-md shadow-black/5 md:px-6">
          <div className="flex items-center gap-3">
            <button
              aria-label="Toggle navigation"
              className="flex-center h-10 w-10 rounded-md text-sidebarGray hover:bg-gray-100"
              onClick={() => {
                if (window.matchMedia('(min-width: 1024px)').matches) setCollapsed((c) => !c);
                else setOpen((o) => !o);
              }}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-headingBlack md:text-base">
                {activeGroup ? `${activeGroup.label} · ${current?.label ?? ''}` : (current?.label ?? 'Dashboard')}
              </p>
              <p className="hidden text-xs text-primaryGray md:block">{contractor.businessName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <NavLink
              to="/notifications"
              aria-label={`Notifications, ${unread} unread`}
              className="relative flex-center h-10 w-10 rounded-full text-sidebarGray hover:bg-gray-100"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex-center h-4 min-w-4 rounded-full bg-brand-red px-1 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </NavLink>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-gray-100">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primaryHoverMenu text-sm font-semibold text-primary">
                      {contractor.contactName
                        .split(' ')
                        .map((p) => p[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-medium text-headingBlack">{contractor.contactName}</p>
                    <p className="text-xs text-primaryGray">Independent Contractor</p>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-primaryGray md:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium">{contractor.contactName}</p>
                  <p className="text-xs text-primaryGray">{contractor.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink to="/profile">Profile &amp; business info</NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <NavLink to="/contracts">Contracts &amp; agreements</NavLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>Sign out (demo)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
