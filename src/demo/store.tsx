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
  RECURRING,
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
  RecurringRide,
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
  recurring: RecurringRide[];
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
  recurringById: (id?: string) => RecurringRide | undefined;
  /* ride actions */
  accept: (rideId: string) => void;
  reject: (rideId: string, reason: string) => void;
  acceptAllPending: () => void;
  rejectAllPending: (reason: string) => void;
  assign: (rideId: string, driverId: string) => void;
  unassign: (rideId: string) => void;
  /* bulk (checkbox selection) */
  acceptMany: (rideIds: string[]) => void;
  rejectMany: (rideIds: string[], reason: string) => void;
  assignMany: (rideIds: string[], driverId: string) => void;
  /* recurring series */
  acceptRecurring: (id: string) => void;
  rejectRecurring: (id: string, reason: string) => void;
  assignRecurringDriver: (id: string, driverId: string | null) => void;
  updateRecurring: (id: string, patch: Partial<Pick<RecurringRide, 'driverId' | 'vehicleId' | 'notes'>>) => void;
  /* edit pages */
  updateRide: (id: string, patch: Partial<L.RideEditable>) => boolean;
  setRideStatus: (id: string, status: Ride['status']) => void;
  updateDriver: (id: string, patch: Partial<Omit<Driver, 'id' | 'compliance'>>) => void;
  updateVehicle: (id: string, patch: Partial<Omit<Vehicle, 'id'>>) => void;
  addVehicle: (input: Omit<Vehicle, 'id'>) => Vehicle;
  /* drivers */
  addDriver: (input: NewDriverInput) => Driver;
  setDriverStatus: (driverId: string, status: Driver['status']) => void;
  /* notifications */
  markRead: (id: string) => void;
  markReadMany: (ids: string[]) => void;
  markAllRead: () => void;
  /* documents */
  markDocumentUploaded: (docId: string) => void;
  /* demo */
  resetDemo: () => void;
}

const Ctx = createContext<DemoState | null>(null);

/* Demo state survives a reload within the tab (sessionStorage) so a reviewer can refresh
   or deep-link without losing what they just did. "Reset demo data" clears it. */
const STORAGE_KEY = 'maguy-contractor-demo-v3';
interface Persisted {
  rides: Ride[];
  recurring: RecurringRide[];
  drivers: Driver[];
  vehicles: Vehicle[];
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
  const [recurring, setRecurring] = useState<RecurringRide[]>(persisted?.recurring ?? RECURRING);
  const [drivers, setDrivers] = useState<Driver[]>(persisted?.drivers ?? DRIVERS);
  const [vehicles, setVehicles] = useState<Vehicle[]>(persisted?.vehicles ?? VEHICLES);
  const [documents, setDocuments] = useState<Document[]>(persisted?.documents ?? DOCUMENTS);
  const [notifications, setNotifications] = useState<AppNotification[]>(persisted?.notifications ?? NOTIFICATIONS);

  useEffect(() => {
    savePersisted({ rides, recurring, drivers, vehicles, documents, notifications });
  }, [rides, recurring, drivers, vehicles, documents, notifications]);

  const driverById = useCallback((id?: string) => drivers.find((d) => d.id === id), [drivers]);
  const vehicleById = useCallback((id?: string) => vehicles.find((v) => v.id === id), [vehicles]);
  const rideById = useCallback((id?: string) => rides.find((r) => r.id === id), [rides]);
  const recurringById = useCallback((id?: string) => recurring.find((s) => s.id === id), [recurring]);

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

  /* ---- bulk actions from checkbox selection ---- */
  const acceptMany = useCallback(
    (rideIds: string[]) => {
      const n = rides.filter((r) => rideIds.includes(r.id) && L.canAccept(r)).length;
      if (n === 0) {
        toast.error('None of the selected rides are pending.');
        return;
      }
      setRides((prev) => L.acceptMany(prev, rideIds, NOW_ISO));
      toast.success(`${n} ride${n === 1 ? '' : 's'} accepted`);
    },
    [rides],
  );

  const rejectMany = useCallback(
    (rideIds: string[], reason: string) => {
      const n = rides.filter((r) => rideIds.includes(r.id) && L.canReject(r)).length;
      if (n === 0 || !reason.trim()) return;
      setRides((prev) => L.rejectMany(prev, rideIds, reason, NOW_ISO));
      toast(`${n} ride${n === 1 ? '' : 's'} rejected`, { description: 'Maguy dispatch has been notified.' });
    },
    [rides],
  );

  const assignMany = useCallback(
    (rideIds: string[], driverId: string) => {
      const driver = drivers.find((d) => d.id === driverId);
      if (!driver) return;
      if (!L.driverCanBeAssigned(driver)) {
        toast.error(`${L.fullName(driver)} has an expired compliance item and cannot be assigned.`);
        return;
      }
      const n = rides.filter((r) => rideIds.includes(r.id) && L.canAssignDriver(r)).length;
      if (n === 0) {
        toast.error('Select accepted rides to assign a driver.');
        return;
      }
      setRides((prev) => L.assignMany(prev, rideIds, driver));
      toast.success(`${L.fullName(driver)} assigned to ${n} ride${n === 1 ? '' : 's'}`);
    },
    [drivers, rides],
  );

  /* ---- recurring series ---- */
  const acceptRecurring = useCallback(
    (id: string) => {
      setRecurring((prev) => prev.map((s) => (s.id === id ? L.acceptRecurring(s, NOW_ISO) : s)));
      const s = recurring.find((x) => x.id === id);
      toast.success(`Recurring ride ${s?.requestId ?? ''} accepted`, {
        description: 'Occurrences now appear on your Schedule and Calendar. Assign a default driver.',
      });
    },
    [recurring],
  );

  const rejectRecurring = useCallback(
    (id: string, reason: string) => {
      if (!reason.trim()) {
        toast.error('A reason is required to reject a recurring ride.');
        return;
      }
      setRecurring((prev) => prev.map((s) => (s.id === id ? L.rejectRecurring(s, reason, NOW_ISO) : s)));
      const s = recurring.find((x) => x.id === id);
      toast(`Recurring ride ${s?.requestId ?? ''} rejected`, {
        description: 'Maguy dispatch has been notified and will reassign the series.',
      });
    },
    [recurring],
  );

  const assignRecurringDriver = useCallback(
    (id: string, driverId: string | null) => {
      if (driverId === null) {
        setRecurring((prev) => prev.map((s) => (s.id === id ? L.unassignRecurringDriver(s) : s)));
        toast('Default driver removed from the series.');
        return;
      }
      const driver = drivers.find((d) => d.id === driverId);
      if (!driver) return;
      if (!L.driverCanBeAssigned(driver)) {
        toast.error(`${L.fullName(driver)} has an expired compliance item and cannot be assigned.`);
        return;
      }
      setRecurring((prev) => prev.map((s) => (s.id === id ? L.assignRecurringDriver(s, driver) : s)));
      const s = recurring.find((x) => x.id === id);
      toast.success(`${L.fullName(driver)} is the default driver for ${s?.requestId ?? 'the series'}`);
    },
    [drivers, recurring],
  );

  const updateRecurring = useCallback(
    (id: string, patch: Partial<Pick<RecurringRide, 'driverId' | 'vehicleId' | 'notes'>>) => {
      if (patch.driverId) {
        const d = drivers.find((x) => x.id === patch.driverId);
        if (d && !L.driverCanBeAssigned(d)) {
          toast.error(`${L.fullName(d)} has an expired compliance item and cannot be assigned.`);
          return;
        }
      }
      setRecurring((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          let next = { ...s, ...('notes' in patch ? { notes: patch.notes } : {}) };
          if ('driverId' in patch) {
            const d = drivers.find((x) => x.id === patch.driverId);
            next = d ? L.assignRecurringDriver(next, d) : L.unassignRecurringDriver(next);
          }
          if ('vehicleId' in patch && next.driverId) next.vehicleId = patch.vehicleId || undefined;
          return next;
        }),
      );
      toast.success('Recurring ride updated');
    },
    [drivers],
  );

  /* ---- edit pages ---- */
  const updateRide = useCallback(
    (id: string, patch: Partial<L.RideEditable>): boolean => {
      const ride = rides.find((r) => r.id === id);
      if (!ride) return false;
      if (!L.canEditRide(ride)) {
        toast.error('A rejected or cancelled ride cannot be edited.');
        return false;
      }
      if (patch.driverId) {
        const d = drivers.find((x) => x.id === patch.driverId);
        if (d && !L.driverCanBeAssigned(d)) {
          toast.error(`${L.fullName(d)} has an expired compliance item and cannot be assigned.`);
          return false;
        }
      }
      setRides((prev) => prev.map((r) => (r.id === id ? L.applyRideEdit(r, patch, drivers) : r)));
      toast.success(`Ride ${ride.rideNo} updated`);
      return true;
    },
    [rides, drivers],
  );

  const setRideStatusAction = useCallback(
    (id: string, status: Ride['status']) => {
      const ride = rides.find((r) => r.id === id);
      if (!ride || !L.canSetStatus(ride, status)) {
        toast.error('That status change is not allowed from the ride’s current state.');
        return;
      }
      setRides((prev) => prev.map((r) => (r.id === id ? L.setRideStatus(r, status, NOW_ISO.slice(11, 16), NOW_ISO) : r)));
      toast.success(`${ride.rideNo} marked ${L.RIDE_STATUS_LABEL[status]}`);
    },
    [rides],
  );

  const updateDriver = useCallback((id: string, patch: Partial<Omit<Driver, 'id' | 'compliance'>>) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    toast.success('Driver updated');
  }, []);

  const updateVehicle = useCallback((id: string, patch: Partial<Omit<Vehicle, 'id'>>) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    toast.success('Vehicle updated');
  }, []);

  const addVehicle = useCallback((input: Omit<Vehicle, 'id'>): Vehicle => {
    const vehicle: Vehicle = { ...input, id: `veh_${Date.now()}` };
    setVehicles((prev) => [...prev, vehicle]);
    toast.success(`${vehicle.name} added`, { description: 'Upload its inspection and insurance under Compliance & Documents.' });
    return vehicle;
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
  const markReadMany = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setNotifications((prev) => prev.map((n) => (set.has(n.id) ? { ...n, read: true } : n)));
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
    setRecurring(RECURRING);
    setDrivers(DRIVERS);
    setVehicles(VEHICLES);
    setDocuments(DOCUMENTS);
    setNotifications(NOTIFICATIONS);
    toast('Demo data reset');
  }, []);

  const value = useMemo<DemoState>(
    () => ({
      today: TODAY,
      contractor: CONTRACTOR,
      rides,
      recurring,
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
      recurringById,
      accept,
      reject,
      acceptAllPending,
      rejectAllPending,
      assign,
      unassign,
      acceptMany,
      rejectMany,
      assignMany,
      acceptRecurring,
      rejectRecurring,
      assignRecurringDriver,
      updateRecurring,
      updateRide,
      setRideStatus: setRideStatusAction,
      updateDriver,
      updateVehicle,
      addVehicle,
      addDriver,
      setDriverStatus,
      markRead,
      markReadMany,
      markAllRead,
      markDocumentUploaded,
      resetDemo,
    }),
    [
      rides,
      recurring,
      drivers,
      vehicles,
      documents,
      notifications,
      driverById,
      vehicleById,
      rideById,
      recurringById,
      accept,
      reject,
      acceptAllPending,
      rejectAllPending,
      assign,
      unassign,
      acceptMany,
      rejectMany,
      assignMany,
      acceptRecurring,
      rejectRecurring,
      assignRecurringDriver,
      updateRecurring,
      updateRide,
      setRideStatusAction,
      updateDriver,
      updateVehicle,
      addVehicle,
      addDriver,
      setDriverStatus,
      markRead,
      markReadMany,
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
