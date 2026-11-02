import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { DemoProvider } from '@/demo/store';
import { DashboardLayout } from '@/layout/DashboardLayout';
import Dashboard from '@/pages/Dashboard';
import Dispatch from '@/pages/Dispatch';
import Schedule from '@/pages/schedules/Schedule';
import RideRequest from '@/pages/schedules/RideRequest';
import RecurringRides from '@/pages/schedules/RecurringRides';
import Calendar from '@/pages/schedules/Calendar';
import History from '@/pages/History';
import Drivers from '@/pages/Drivers';
import Vehicles from '@/pages/Vehicles';
import Documents from '@/pages/Documents';
import Contracts from '@/pages/Contracts';
import PayPeriods from '@/pages/PayPeriods';
import Notifications from '@/pages/Notifications';
import Profile from '@/pages/Profile';

/** /rides moved under Schedules → Schedule; keep old deep links (?ride=, ?tab=) working. */
function RidesRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/schedules', search }} replace />;
}

export default function App() {
  return (
    <DemoProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="dispatch" element={<Dispatch />} />
            <Route path="schedules" element={<Schedule />} />
            <Route path="schedules/ride-request" element={<RideRequest />} />
            <Route path="schedules/recurring-rides" element={<RecurringRides />} />
            <Route path="schedules/calendar" element={<Calendar />} />
            <Route path="rides" element={<RidesRedirect />} />
            <Route path="history" element={<History />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="documents" element={<Documents />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="pay-periods" element={<PayPeriods />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors closeButton toastOptions={{ className: 'font-poppins text-sm' }} />
    </DemoProvider>
  );
}
