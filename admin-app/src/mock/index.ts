// All mock data has been removed. All data is fetched from the ASP.NET Core backend API.
import {
  AdminKPI,
  AdminOrder,
  BankTransferRequest,
  AdminProduct,
  DriverCustodyAccount,
  AuditLog,
  AdminCategory,
  AdminStore,
  AdminFlashDeal,
} from '../types';

export const mockAdminKPI: AdminKPI = {
  ordersToday: 0,
  salesTotal: 0,
  salesChangePercent: 0,
  grossProfit: 0,
  profitMarginPercent: 0,
  purchaseCostTotal: 0,
  fieldCustodyTotal: 0,
  criticalPendingCount: 0,
  pendingDriverOrdersCount: 0,
  pendingBankTransfersCount: 0,
};

export const mockAdminOrders: AdminOrder[] = [];
export const mockBankTransferRequests: BankTransferRequest[] = [];
export const mockAdminProducts: AdminProduct[] = [];
export const mockDriverCustodyAccounts: DriverCustodyAccount[] = [];
export const mockAuditLogs: AuditLog[] = [];
export const mockAdminCategories: AdminCategory[] = [];
export const mockAdminStores: AdminStore[] = [];
export const mockAdminFlashDeals: AdminFlashDeal[] = [];
