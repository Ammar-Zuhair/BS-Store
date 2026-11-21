/**
 * Courier / Driver App Domain Models & Types
 * Derived from System Architecture Specification
 */

export type ShiftStatus = 'ONLINE' | 'OFFLINE' | 'BUSY';

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  rating: number;
  reviewsCount: number;
  vehicleType: string;
  vehiclePlate: string;
  shiftStatus: ShiftStatus;
  shiftDuration: string;
}

export interface TaskStop {
  id: string;
  type: 'PICKUP_STORE' | 'DELIVERY_CUSTOMER';
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'PENDING' | 'ARRIVED' | 'COMPLETED';
  isExternalPurchase: boolean; // Requires purchase confirmation
  storePhone?: string;
  notes?: string;
}

export interface TaskPurchasedItem {
  baseName?: string;
  selectedOptions?: { groupName: string; valueName: string }[];
  bundleTitle?: string;
  bundleGroupId?: string;
  id: string;
  name: string;
  quantity: number;
  customerPrice: number;
  imageUrl: string;
  subOrderId: string;
}

export interface ActiveDeliveryTask {
  walletPaidAmount?: number;
  transferMethodName?: string;
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerDistrict?: string;
  customerBuildingFloor?: string;
  deliveryNotes?: string;
  stops: TaskStop[];
  currentStopIndex: number;
  itemsToPurchase: TaskPurchasedItem[];
  subtotalProducts?: number;
  deliveryFee?: number;
  amountToCollect: number;
  transferredAmount: number;
  isTransferAmountConfirmed: boolean;
  paymentMethod: 'CASH_ON_DELIVERY' | 'MANUAL_TRANSFER';
  isPaymentVerified: boolean;
  totalDistanceKm: number;
  estimatedMinutes: number;
  status: 'ASSIGNED' | 'EN_ROUTE_PICKUP' | 'PURCHASING' | 'EN_ROUTE_DELIVERY' | 'DELIVERED';
  driverProfitSharePercent: number;
  driverEstimatedEarnings: number;
  cashRefundAtDelivery: number;
}

export interface DriverTransaction {
  id: string;
  type: 'CUSTOMER_COLLECTION' | 'STORE_PURCHASE' | 'COMPANY_SETTLEMENT' | 'DRIVER_EARNING';
  amount: number;
  direction: 'DEBIT' | 'CREDIT';
  referenceNumber: string;
  description: string;
  date: string;
}

export interface DriverWalletSummary {
  walletChangeCreditedToday?: number;
  totalWalletChangeCredited?: number;
  totalWalletChangeReversed?: number;
  currentCashCustody: number; // العهدة النقدية المتوقعة بحوزة الكابتن
  todayEarnings: number; // أرباح الكابتن المستحقة اليوم
  profitSharePercent: number;
  completedTripsToday: number; // عدد المشاوير المكتملة
  totalDistanceTodayKm: number;
}
