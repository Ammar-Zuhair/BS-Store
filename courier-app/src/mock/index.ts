// All mock data has been removed. All data is fetched dynamically from the ASP.NET Core backend API.
import {
  DriverProfile,
  ActiveDeliveryTask,
  DriverWalletSummary,
  DriverTransaction,
  OrderInvoice,
} from '../types';

export const mockDriverProfile: DriverProfile = {
  id: '',
  name: '',
  phone: '',
  avatarUrl: '',
  rating: 5.0,
  reviewsCount: 0,
  vehicleType: '',
  vehiclePlate: '',
  shiftStatus: 'OFFLINE',
  shiftDuration: '0',
};

export const mockActiveTask: ActiveDeliveryTask | null = null;

export const mockDriverWallet: DriverWalletSummary = {
  currentCashCustody: 0,
  todayEarnings: 0,
  completedTripsToday: 0,
  totalDistanceTodayKm: 0,
};

export const mockDriverTransactions: DriverTransaction[] = [];
export const mockOrderInvoices: OrderInvoice[] = [];
