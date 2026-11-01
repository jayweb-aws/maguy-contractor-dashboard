/* Shell: white 260px sidebar + sticky white topbar + gray body — Medtransport's dashboard chrome. */
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Bell,
  Car,
  ChevronDown,
  ClipboardList,
  FileSignature,
  FolderOpen,
  History,
  LayoutDashboard,
  Menu,
  Receipt,
  RotateCcw,
  UserCircle,
  Users,
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

const NAV = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Rides', to: '/rides', icon: ClipboardList },
  { label: 'Ride History', to: '/history', icon: History },
  { label: 'My Drivers', to: '/drivers', icon: Users },
  { label: 'Vehicles', to: '/vehicles', icon: Car },
  { label: 'Compliance & Documents', to: '/documents', icon: FolderOpen },
  { label: 'Contracts & Agreements', to: '/contracts', icon: FileSignature },
  { label: 'Pay Period Reports', to: '/pay-periods', icon: Receipt },
  { label: 'Notifications', to: '/notifications', icon: Bell, badge: true },
  { label: 'Profile', to: '/profile', icon: UserCircle },
];

export function DashboardLayout() {
  const [open, setOpen] = useState(false); // mobile drawer
  const [collapsed, setCollapsed] = useState(false); // desktop rail
  const { contractor, unread, resetDemo, rides } = useDemo();
  const location = useLocation();
  const current = NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));
  const pendingCount = rides.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* mobile backdrop */}
      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
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
            {NAV.map(({ label, to, icon: Icon, end, badge }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-[1.1rem] py-[0.7rem] text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#F1F6FF] text-brand-deep-blue'
                        : 'text-sidebarGray hover:bg-[#F1F6FF]/70 hover:text-headingBlack',
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {badge && unread > 0 && (
                    <span className="count flex-center h-5 min-w-5 rounded-full bg-[#F1F6FF] px-1.5 text-[11px] font-semibold text-primary">
                      {unread}
                    </span>
                  )}
                  {to === '/rides' && pendingCount > 0 && (
                    <span className="count flex-center h-5 min-w-5 rounded-full bg-[#FFFACC] px-1.5 text-[11px] font-semibold text-[#726D41]">
                      {pendingCount}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
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
              <p className="text-sm font-semibold text-headingBlack md:text-base">{current?.label ?? 'Dashboard'}</p>
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
