import { ActiveDeliveryTask } from '../types';

export function paymentLabel(task: Pick<ActiveDeliveryTask, 'paymentMethod' | 'walletPaidAmount' | 'amountToCollect' | 'isTransferAmountConfirmed' | 'transferMethodName'>): string {
  if (task.paymentMethod === 'MANUAL_TRANSFER') return `دفع إلكتروني${task.transferMethodName ? ` · ${task.transferMethodName}` : ''}${task.isTransferAmountConfirmed ? '' : ' · بانتظار تأكيد المبلغ'}`;
  if ((task.walletPaidAmount || 0) > 0) return task.amountToCollect > 0 ? 'المحفظة + المتبقي نقداً' : 'مدفوع من المحفظة';
  return 'نقداً عند الاستلام';
}
