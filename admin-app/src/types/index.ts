/**
 * Admin App Domain Models & Types
 * Derived from System Architecture Specification
 */

export type OrderStatus =
  | 'ALL'
  | 'PENDING_ADMIN_APPROVAL'
  | 'PAYMENT_PENDING_VERIFICATION'
  | 'PAYMENT_FAILED'
  | 'CONFIRMED'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'PURCHASING'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'RETURNED'
  | 'CANCELLED';

/** نظام سير الطلبات: يدوي = موافقة المدير أولاً ، تلقائي = تعيين مباشر */
export type OrderWorkflowMode = 'MANUAL_APPROVAL' | 'AUTO_ASSIGN';

export interface FlaggedUser {
  id: string;
  name: string;
  phone: string;
  reason: string;
  flaggedAt: string;
  isBanned: boolean;
  cancelCount: number;
}

export interface AdminKPI {
  ordersToday: number;
  salesTotal: number;
  salesChangePercent: number;
  grossProfit: number;
  profitMarginPercent: number;
  purchaseCostTotal: number;
  fieldCustodyTotal: number;
  criticalPendingCount: number;
  pendingDriverOrdersCount: number;
  pendingBankTransfersCount: number;
}

export interface AdminOrderItem {
  productId: string;
  productName: string;
  expectedPurchaseCost: number;
  sellingPrice: number;
  quantity: number;
  actualPurchaseCost?: number;
}

export interface AdminSubOrder {
  id: string;
  storeId: string;
  storeName: string;
  governorateId?: string;
  governorateName?: string;
  items: AdminOrderItem[];
  subtotal: number;
  expectedCost: number;
  expectedProfit: number;
  status: 'PENDING' | 'PURCHASED' | 'READY';
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  customerGovernorateId?: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  status: OrderStatus;
  subOrders: AdminSubOrder[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  paymentMethod: 'CASH_ON_DELIVERY' | 'MANUAL_TRANSFER';
  paymentStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  assignedDriverId?: string;
  assignedDriverName?: string;
  transferReceiptUrl?: string;
  transferReference?: string;
  addressSummary: string;
  customerRating?: number;
  customerReview?: string;
  notes?: string;
}

export interface BankTransferRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  amountReceived?: number | null;
  amountReceivedAt?: string | null;
  amountReceivedBy?: string | null;
  transferProvider?: 'ALKURAIMI' | 'WALLET' | null;
  transferReference: string;
  receiptImageUrl: string;
  uploadedAt: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
}

export interface AdminSubCategory {
  id: string;
  name: string;
  icon: string;
  productCount: number;
  isActive: boolean;
}

export interface AdminCategory {
  id: string;
  name: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  productCount: number;
  subcategories: AdminSubCategory[];
}

export interface AdminStore {
  openingTime?: string | null;
  closingTime?: string | null;
  is24Hours?: boolean;
  id: string;
  name: string;
  categoryId: string;
  categoryIds?: string[];
  categoryName: string;
  subcategories: string[];
  phone: string;
  address: string;
  imageUrl: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  isOpen: boolean;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  governorateId?: string;
  governorateName?: string;
}

export interface DeliverySettings {
  isEnabled: boolean;
  baseFee: number;
  baseDistanceKm: number;
  perKmFee: number;
  isDynamicPricingEnabled: boolean;
}

export interface DiscountTier {
  minAmount: number;
  maxAmount?: number | null;
  discountPercent: number;
}

export interface AdminFlashDeal {
  id: string;
  title: string;
  storeName: string;
  originalPrice: number;
  discountPrice: number;
  discountPercent: number;
  imageUrl: string;
  remainingHours: number;
  isActive: boolean;
  dealType?: 'BUNDLE' | 'DELIVERY_DISCOUNT' | 'STORE_OFFER' | 'PRODUCT_DISCOUNT';
  couponCode?: string;
  isPublic?: boolean;
  expiresAt?: string;
  storeId?: string;
  categoryId?: string;
  visibility?: string;
  bundleItems?: { name: string; price: number; imageUrl?: string }[];
  dealKind?: string;
  discountKind?: 'DELIVERY_DISCOUNT' | 'PRODUCT_DISCOUNT';
  deliveryDiscountPercent?: number;
  discountTiers?: DiscountTier[];
  description?: string;
  badge?: string;
  isFreeDelivery?: boolean;
  products?: { id: string; name: string; price: number; description?: string; imageUrl?: string }[];
}

export interface AdminProductPriceChange {
  id: string;
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  orderId: string;
  orderNumber: string;
  subOrderId: string;
  orderItemId: string;
  driverId: string;
  driverName: string;
  observedPrice: number;
  currentCatalogPrice: number;
  newStorePrice: number;
  orderItemOriginalPrice: number;
  orderItemFinalPrice: number;
  percentageChange: number;
  flagForAdminReview: boolean;
  customerContactConfirmed: boolean;
  contactInitiatedAt: string;
  reason: string;
  createdAt: string;
}

export interface AdminPriceChangeComplaint {
  id: string;
  customerId: string;
  customerName: string;
  orderId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  storeName: string;
  priceChangeId: string;
  driverId: string;
  driverName: string;
  oldPrice: number;
  newPrice: number;
  percentageChange: number;
  customerContactConfirmed: boolean;
  contactInitiatedAt: string | null;
  reason: string;
  customerNotes?: string | null;
  status: 'OPEN' | 'REVIEWING' | 'RESOLVED';
  createdAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  resolutionNotes?: string | null;
}

export interface AdminProduct {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  storeId: string;
  storeName: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string;
  subcategoryName?: string;
  sourceType: 'IN_STOCK' | 'EXTERNAL_STORE';
  expectedPurchasePrice: number;
  sellingPrice: number;
  isActive: boolean;
  isTopPick?: boolean;
  isBundle?: boolean;
  imageUrl: string;
  images?: string[];
  createdAt?: string;
}

export interface DriverCustodyAccount {
  driverId: string;
  driverName: string;
  phone: string;
  governorateId?: string;
  governorateName?: string;
  isApproved?: boolean;
  vehiclePlate: string;
  status: 'ONLINE' | 'BUSY' | 'OFFLINE';
  totalCollections: number; // تحصيلات نقدية من العملاء (+)
  totalStorePurchases: number; // مشتريات من المتاجر بالعهدة (-)
  totalSettlements: number; // مبالغ مسلمة للإدارة (-)
  totalFundings: number;
  totalEarnings: number; // مستحقات الموصل المكتسبة من هامش أرباح الطلبات
  expectedCashCustody: number; // صافي العهدة المستحقة
  lastSettlementDate: string;
}

export interface DriverSettlementRecord {
  id: string;
  driverId: string;
  driverName: string;
  amountReceived: number;
  expectedAmount: number;
  difference: number;
  status: 'COMPLETED' | 'DISCREPANCY_FLAGGED';
  notes?: string;
  reviewedAt: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  action: string;
  entityName: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export type ManagedAppType = 'customer' | 'admin' | 'courier';
export type ManagedPlatform = 'android' | 'ios';
export type BroadcastType = 'offer' | 'announcement' | 'update' | 'maintenance' | 'alert';

export interface AdminAppVersionConfiguration {
  id: string;
  appType: ManagedAppType;
  platform: ManagedPlatform;
  latestVersion: string;
  minimumSupportedVersion: string;
  latestBuildNumber: number | null;
  minimumBuildNumber: number | null;
  updateUrl: string | null;
  updateTitle: string;
  updateMessage: string;
  isActive: boolean;
  updatedAt: string;
}

export interface AdminMaintenanceState {
  maintenance: boolean;
  title: string | null;
  message: string | null;
  expectedEndAt: string | null;
  startedAt?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface AdminBroadcastHistoryItem {
  id: string;
  type: BroadcastType;
  title: string;
  body: string;
  createdByAdminId: string;
  createdAt: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Partial' | 'Failed';
  targetCount: number;
  successCount: number;
  failureCount: number;
  failureSummary?: string | null;
}
