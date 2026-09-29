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
  isExternalPurchase: boolean; // Requires actual purchase recording
  storePhone?: string;
  notes?: string;
  receiptImageUrl?: string;
}

export interface TaskPurchasedItem {
  id: string;
  name: string;
  quantity: number;
  expectedPrice: number;
  actualPrice?: number;
  imageUrl: string;
  storeId?: string;
  storeName?: string;
}

export interface OrderInvoice {
  id: string;
  orderNumber: string;
  storeName: string;
  invoiceNumber: string;
  amount: number;
  receiptImageUrl: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  uploadedAt: string;
  notes?: string;
  itemsCount: number;
  rejectionReason?: string;
}

export interface ActiveDeliveryTask {
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
  paymentMethod: 'CASH_ON_DELIVERY' | 'MANUAL_TRANSFER';
  isPaymentVerified: boolean;
  totalDistanceKm: number;
  estimatedMinutes: number;
  status: 'ASSIGNED' | 'EN_ROUTE_PICKUP' | 'PURCHASING' | 'EN_ROUTE_DELIVERY' | 'DELIVERED';
  purchaseReceiptImageUrl?: string;
}

export interface DriverTransaction {
  id: string;
  type: 'CUSTOMER_COLLECTION' | 'STORE_PURCHASE' | 'COMPANY_SETTLEMENT';
  amount: number;
  direction: 'DEBIT' | 'CREDIT';
  referenceNumber: string;
  description: string;
  date: string;
}

export interface DriverWalletSummary {
  currentCashCustody: number; // العهدة النقدية المتوقعة بحوزة الكابتن
  todayEarnings: number; // أرباح الكابتن المستحقة اليوم
  completedTripsToday: number; // عدد المشاوير المكتملة
  totalDistanceTodayKm: number;
}
