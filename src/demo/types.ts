/* Domain types for the contractor portal demo.
   Field names follow Backend's schedule / account models where one exists
   (contractor, driver, acceptedBy, rejectedBy, pickUpCharge, billableMiles …). */

export type RideStatus =
  | 'pending' // assigned to the contractor by Maguy dispatch, awaiting Accept / Reject
  | 'accepted' // contractor accepted, no driver yet
  | 'assigned' // contractor assigned one of their drivers
  | 'en-route'
  | 'arrived' // driver at the pickup address (Medtransport dispatch "Arrived" tab)
  | 'picked-up'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type Mobility = 'Ambulatory' | 'Wheelchair' | 'Stretcher' | 'Bariatric';
export type FundingSource = 'Medicaid' | 'Institution' | 'Brokerage' | 'Private Pay';
export type TripType = 'One-way' | 'Round trip';

export interface Ride {
  id: string;
  rideNo: string;
  date: string; // YYYY-MM-DD
  pickupTime: string; // HH:mm (24h)
  appointmentTime?: string;
  patient: { name: string; phone: string; mobility: Mobility; notes?: string };
  pickup: string;
  dropoff: string;
  tripType: TripType;
  billableMiles: number;
  fundingSource: FundingSource;
  billingAccount: string;
  /* money is stored in integer cents */
  billableAmount: number;
  commissionPct: number;
  pickUpCharge: number;
  payableAmount: number;
  status: RideStatus;
  driverId?: string;
  vehicleId?: string;
  assignedAt: string; // ISO datetime — when Maguy dispatched it to the contractor
  respondBy: string; // ISO datetime — soft deadline to accept / reject
  rejectReason?: string;
  rejectedAt?: string;
  acceptedAt?: string;
  completedAt?: string;
  actualPickupTime?: string;
  actualDropoffTime?: string;
  /** set when the ride is one occurrence of a recurring series */
  recurringId?: string;
}

/* ---------- recurring rides (Medtransport "Recurring Ride Request" → "Approved Recurring Rides") ---------- */

/** 0 = Sunday … 6 = Saturday, as in JavaScript's Date#getDay */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type RecurringStatus =
  | 'pending' // Maguy assigned the series; contractor must accept / reject
  | 'active' // accepted — occurrences are generated into the schedule
  | 'paused' // Maguy paused the series (facility request)
  | 'ended' // past its end date
  | 'rejected';

export interface RecurringRide {
  id: string;
  requestId: string;
  patient: { name: string; phone: string; mobility: Mobility; notes?: string };
  days: Weekday[];
  pickupTime: string; // HH:mm
  appointmentTime?: string;
  returnTime?: string; // round trips — leg B pickup
  tripType: TripType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  pickup: string;
  dropoff: string;
  billingAccount: string;
  fundingSource: FundingSource;
  billableMiles: number;
  /* per occurrence, integer cents */
  billableAmount: number;
  commissionPct: number;
  pickUpCharge: number;
  payableAmount: number;
  status: RecurringStatus;
  driverId?: string; // default driver for every occurrence
  vehicleId?: string;
  assignedAt: string;
  respondBy?: string;
  acceptedAt?: string;
  rejectReason?: string;
  rejectedAt?: string;
}

/** One generated date of a recurring series (not stored — derived for calendar / schedule views). */
export interface RecurringOccurrence {
  id: string; // `${recurringId}@${date}`
  recurringId: string;
  requestId: string;
  date: string;
  pickupTime: string;
  appointmentTime?: string;
  patient: RecurringRide['patient'];
  pickup: string;
  dropoff: string;
  tripType: TripType;
  payableAmount: number;
  driverId?: string;
  vehicleId?: string;
  status: RecurringStatus;
}

export type DriverStatus = 'active' | 'inactive' | 'on-leave';
export type ComplianceState = 'valid' | 'expiring' | 'expired' | 'missing';

export interface ComplianceItem {
  key: string;
  label: string;
  state: ComplianceState;
  expires?: string; // YYYY-MM-DD
}

export interface Driver {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: 'Driver' | 'Driver / Dispatcher';
  hireDate: string;
  status: DriverStatus;
  vehicleId?: string;
  compliance: ComplianceItem[];
}

export type VehicleOwnership = 'Contractor-owned' | 'Maguy-owned';
export type VehicleStatus = 'active' | 'maintenance' | 'inactive';

export interface Vehicle {
  id: string;
  name: string; // "2021 Toyota Sienna"
  plate: string;
  type: 'Sedan' | 'Wheelchair Van' | 'Stretcher Van' | 'Minivan';
  ownership: VehicleOwnership;
  status: VehicleStatus;
  capacity: string;
  inspectionDue: string;
  insuranceExpires: string;
  driverId?: string;
}

export interface Document {
  id: string;
  title: string;
  category: 'Business' | 'Insurance' | 'Training' | 'Driver';
  owner: 'company' | string; // driverId when a driver document
  state: ComplianceState;
  expires?: string;
  uploadedAt?: string;
}

export interface Contract {
  id: string;
  title: string;
  type: 'Service Agreement' | 'Rate Schedule' | 'Compliance Addendum' | 'NDA';
  status: 'active' | 'pending-signature' | 'expired';
  effective: string;
  expires?: string;
  signedAt?: string;
}

export interface PayPeriod {
  id: string;
  reportId: string;
  start: string;
  end: string;
  rides: number;
  payableAmount: number; // cents
  status: 'open' | 'submitted' | 'approved' | 'paid';
}

export type NotificationType = 'ride' | 'compliance' | 'pay' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  at: string; // ISO
  read: boolean;
  rideId?: string;
  recurringId?: string;
}

export interface Contractor {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  ein: string;
  npi?: string;
  startDate: string;
  serviceAreas: string[];
  status: 'active';
}
