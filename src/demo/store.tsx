/* In-memory demo store. Every mutation goes through the pure functions in logic.ts.
   Nothing here talks to a backend. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import * as L from './logic';
import {
  CONTRACTOR,
  CONTRACTS,
  DOCUMENTS,
  DRIVERS,
  NOTIFICATIONS,
  NOW_ISO,
  PAY_PERIODS,
  RIDES,
  TODAY,
  VEHICLES,
} from './data';
import type {
  AppNotification,
  Contract,
  Contractor,
  Document,
  Driver,
  PayPeriod,
  Ride,
  Vehicle,
} from './types';

export interface NewDriverInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: Driver['role'];
  hireDate: string;
  vehicleId?: string;
}

interface DemoState {
  today: string;
  contractor: Contractor;
  rides: Ride[];
  drivers: Driver[];
  vehicles: Vehicle[];
  documents: Document[];
  contracts: Contract[];
  payPeriods: PayPeriod[];
  notifications: AppNotification[];
  unread: number;
  /* lookups */
  driverById: (id?: string) => Driver | undefined;
  vehicleById: (id?: string) => Vehicle | undefined;
  rideById: (id?: string) => Ride | undefined;
  /* ride actions */
  accept: (rideId: string) => void;
  reject: (rideId: string, reason: string) => void;
  acceptAllPending: () => void;
  rejectAllPending: (reason: string) => void;
  assign: (rideId: string, driverId: string) => void;
  unassign: (rideId: string) => void;
  /* drivers */
  addDriver: (input: NewDriverInput) => Driver;
  setDriverStatus: (driverId: string, status: Driver['status']) => void;
  /* notifications */
  markRead: (id: string) => void;
  markAllRead: () => void;
  /* documents */
  markDocumentUploaded: (docId: string) => void;
  /* demo */
  resetDemo: () => void;
}

const Ctx = createContext<DemoState | null>(null);

/* Demo state survives a reload within the tab (sessionStorage) so a reviewer can refresh
   or deep-link without losing what they just did. "Reset demo data" clears it. */
const STORAGE_KEY = 'maguy-contractor-demo-v1';
interface Persisted {
  rides: Ride[];
  drivers: Driver[];
  documents: Document[];
  notifications: AppNotification[];
}
function loadPersisted(): Persisted | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}
function savePersisted(p: Persisted) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — demo still works in memory */
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const persisted = useMemo(loadPersisted, []);
  const [rides, setRides] = useState<Ride[]>(persisted?.rides ?? RIDES);
  const [drivers, setDrivers] = useState<Driver[]>(persisted?.drivers ?? DRIVERS);
  const [vehicles] = useState<Vehicle[]>(VEHICLES);
  const [documents, setDocuments] = useState<Document[]>(persisted?.documents ?? DOCUMENTS);
  const [notifications, setNotifications] = useState<AppNotification[]>(persisted?.notifications ?? NOTIFICATIONS);

  useEffect(() => {
    savePersisted({ rides, drivers, documents, notifications });
  }, [rides, drivers, documents, notifications]);

  const driverById = useCallback((id?: string) => drivers.find((d) => d.id === id), [drivers]);
  const vehicleById = useCallback((id?: string) => vehicles.find((v) => v.id === id), [vehicles]);
  const rideById = useCallback((id?: string) => rides.find((r) => r.id === id), [rides]);

  const pushNotification = useCallback((n: Omit<AppNotification, 'id' | 'at' | 'read'>) => {
    setNotifications((prev) => [
      { ...n, id: `n_${Date.now()}`, at: new Date().toISOString(), read: false },
      ...prev,
    ]);
  }, []);

  const accept = useCallback(
    (rideId: string) => {
      setRides((prev) => prev.map((r) => (r.id === rideId ? L.acceptRide(r, NOW_ISO) : r)));
      const r = rides.find((x) => x.id === rideId);
      toast.success(`Ride ${r?.rideNo ?? ''} accepted`, {
        description: 'Assign one of your drivers to schedule it.',
      });
    },
    [rides],
  );

  const reject = useCallback(
    (rideId: string, reason: string) => {
      if (!reason.trim()) {
        toast.error('A reason is required to reject a ride.');
        return;
      }
      setRides((prev) => prev.map((r) => (r.id === rideId ? L.rejectRide(r, reason, NOW_ISO) : r)));
      const r = rides.find((x) => x.id === rideId);
      toast(`Ride ${r?.rideNo ?? ''} rejected`, {
        description: 'Maguy dispatch has been notified and will reassign it.',
      });
    },
    [rides],
  );

  const acceptAllPending = useCallback(() => {
    const n = rides.filter(L.canAccept).length;
    if (n === 0) return;
    setRides((prev) => L.acceptAll(prev, NOW_ISO));
    toast.success(`${n} ride${n === 1 ? '' : 's'} accepted`);
  }, [rides]);

  const rejectAllPending = useCallback(
    (reason: string) => {
      const n = rides.filter((r) => r.status === 'pending').length;
      if (n === 0 || !reason.trim()) return;
      setRides((prev) => L.rejectAllPending(prev, reason, NOW_ISO));
      toast(`${n} ride${n === 1 ? '' : 's'} rejected`);
    },
    [rides],
  );

  const assign = useCallback(
    (rideId: string, driverId: string) => {
      const driver = drivers.find((d) => d.id === driverId);
      if (!driver) return;
      if (!L.driverCanBeAssigned(driver)) {
        toast.error(`${L.fullName(driver)} has an expired compliance item and cannot be assigned.`);
        return;
      }
      setRides((prev) => prev.map((r) => (r.id === rideId ? L.assignDriver(r, driver) : r)));
      const r = rides.find((x) => x.id === rideId);
      toast.success(`${L.fullName(driver)} assigned to ${r?.rideNo ?? 'ride'}`);
    },
    [drivers, rides],
  );

  const unassign = useCallback((rideId: string) => {
    setRides((prev) => prev.map((r) => (r.id === rideId ? L.unassignDriver(r) : r)));
    toast('Driver removed — ride is back to Accepted.');
  }, []);

  const addDriver = useCallback(
    (input: NewDriverInput): Driver => {
      const n = drivers.length + 1;
      const driver: Driver = {
        id: `drv_${Date.now()}`,
        employeeId: `NMP-${(21 + n).toString().padStart(4, '0')}`,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone.trim(),
        email: input.email.trim(),
        role: input.role,
        hireDate: input.hireDate,
        status: 'active',
        vehicleId: input.vehicleId,
        compliance: [
          { key: 'license', label: 'Driver License', state: 'missing' },
          { key: 'cpr', label: 'CPR / First Aid', state: 'missing' },
          { key: 'pass', label: 'PASS Certification', state: 'missing' },
          { key: 'background', label: 'Background Check', state: 'missing' },
          { key: 'drug', label: 'Drug Screen', state: 'missing' },
        ],
      };
      setDrivers((prev) => [...prev, driver]);
      pushNotification({
        type: 'compliance',
        title: 'New driver added',
        body: `${L.fullName(driver)} — upload compliance documents before assigning rides.`,
      });
      toast.success(`${L.fullName(driver)} added`, {
        description: 'Compliance documents are required before assignment.',
      });
      return driver;
    },
    [drivers.length, pushNotification],
  );

  const setDriverStatus = useCallback((driverId: string, status: Driver['status']) => {
    setDrivers((prev) => prev.map((d) => (d.id === driverId ? { ...d, status } : d)));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const markDocumentUploaded = useCallback((docId: string) => {
    const expires = new Date(`${TODAY}T00:00:00`);
    expires.setFullYear(expires.getFullYear() + 1);
    const exp = expires.toISOString().slice(0, 10);
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, state: 'valid', expires: exp, uploadedAt: TODAY } : d)),
    );
    const doc = documents.find((d) => d.id === docId);
    if (doc && doc.owner !== 'company') {
      // reflect on the driver's compliance list
      const key = doc.title.startsWith('PASS')
        ? 'pass'
        : doc.title.startsWith('CPR')
          ? 'cpr'
          : doc.title.startsWith('Drug')
            ? 'drug'
            : undefined;
      if (key) {
        setDrivers((prev) =>
          prev.map((drv) =>
            drv.id === doc.owner
              ? {
                  ...drv,
                  compliance: drv.compliance.map((c) =>
                    c.key === key ? { ...c, state: 'valid', expires: exp } : c,
                  ),
                }
              : drv,
          ),
        );
      }
    }
    toast.success('Document uploaded (demo)', { description: 'Marked valid for 12 months.' });
  }, [documents]);

  const resetDemo = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setRides(RIDES);
    setDrivers(DRIVERS);
    setDocuments(DOCUMENTS);
    setNotifications(NOTIFICATIONS);
    toast('Demo data reset');
  }, []);

  const value = useMemo<DemoState>(
    () => ({
      today: TODAY,
      contractor: CONTRACTOR,
      rides,
      drivers,
      vehicles,
      documents,
      contracts: CONTRACTS,
      payPeriods: PAY_PERIODS,
      notifications,
      unread: L.unreadCount(notifications),
      driverById,
      vehicleById,
      rideById,
      accept,
      reject,
      acceptAllPending,
      rejectAllPending,
      assign,
      unassign,
      addDriver,
      setDriverStatus,
      markRead,
      markAllRead,
      markDocumentUploaded,
      resetDemo,
    }),
    [
      rides,
      drivers,
      vehicles,
      documents,
      notifications,
      driverById,
      vehicleById,
      rideById,
      accept,
      reject,
      acceptAllPending,
      rejectAllPending,
      assign,
      unassign,
      addDriver,
      setDriverStatus,
      markRead,
      markAllRead,
      markDocumentUploaded,
      resetDemo,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDemo must be used inside DemoProvider');
  return v;
}
