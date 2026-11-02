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
import RideView from '@/pages/schedules/RideView';
import RideEdit from '@/pages/schedules/RideEdit';
import RecurringView from '@/pages/schedules/RecurringView';
import RecurringEdit from '@/pages/schedules/RecurringEdit';
import History from '@/pages/History';
import Drivers from '@/pages/Drivers';
import DriverView from '@/pages/drivers/DriverView';
import DriverEdit from '@/pages/drivers/DriverEdit';
import Vehicles from '@/pages/Vehicles';
import VehicleView from '@/pages/vehicles/VehicleView';
import VehicleForm from '@/pages/vehicles/VehicleForm';
import Documents from '@/pages/Documents';
import DocumentView from '@/pages/DocumentView';
import Contracts from '@/pages/Contracts';
import ContractView from '@/pages/ContractView';
import PayPeriods from '@/pages/PayPeriods';
import PayPeriodView from '@/pages/PayPeriodView';
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
            <Route path="schedules/recurring-rides/:id" element={<RecurringView />} />
            <Route path="schedules/recurring-rides/:id/edit" element={<RecurringEdit />} />
            <Route path="schedules/calendar" element={<Calendar />} />
            <Route path="schedules/rides/:id" element={<RideView />} />
            <Route path="schedules/rides/:id/edit" element={<RideEdit />} />
            <Route path="rides" element={<RidesRedirect />} />
            <Route path="history" element={<History />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="drivers/:id" element={<DriverView />} />
            <Route path="drivers/:id/edit" element={<DriverEdit />} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="vehicles/new" element={<VehicleForm mode="add" />} />
            <Route path="vehicles/:id" element={<VehicleView />} />
            <Route path="vehicles/:id/edit" element={<VehicleForm mode="edit" />} />
            <Route path="documents" element={<Documents />} />
            <Route path="documents/:id" element={<DocumentView />} />
            <Route path="contracts" element={<Contracts />} />
            <Route path="contracts/:id" element={<ContractView />} />
            <Route path="pay-periods" element={<PayPeriods />} />
            <Route path="pay-periods/:id" element={<PayPeriodView />} />
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
