export interface WalletMethod {
  id: string; name: string; code: string; accountName: string; accountNumber: string; instructions: string; updatedAt: string; imageUrl?: string; accountType?: string; accountDetails?: string;
}
export interface WalletEntry {
  id: string; amount: number; balanceAfter: number; type: string; description: string; createdAt: string;
  orderNumber?: string; isReversed: boolean;
}
export interface WalletTopUp {
  id: string; amount: number; methodName: string; status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason?: string; createdAt: string; transferReference: string;
}
export interface WalletSummary {
  balance: number; transactions: WalletEntry[]; topUps: WalletTopUp[]; hasMore: boolean;
}
