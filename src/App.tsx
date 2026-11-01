import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { DemoProvider } from '@/demo/store';
import { DashboardLayout } from '@/layout/DashboardLayout';
import Dashboard from '@/pages/Dashboard';
import Rides from '@/pages/Rides';
import History from '@/pages/History';
import Drivers from '@/pages/Drivers';
import Vehicles from '@/pages/Vehicles';
import Documents from '@/pages/Documents';
import Contracts from '@/pages/Contracts';
import PayPeriods from '@/pages/PayPeriods';
import Notifications from '@/pages/Notifications';
import Profile from '@/pages/Profile';

export default function App() {
  return (
    <DemoProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="rides" element={<Rides />} />
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
