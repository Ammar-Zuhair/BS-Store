import type { ScreenName } from '../context/AppContext';
import { formatOrderDate } from './orderDate';

export interface InboxNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
  isRead: boolean;
}

export const notificationLabels: Record<string, string> = {
  promotion: 'عرض ترويجي', offer: 'عرض', announcement: 'إعلان',
  update: 'تحديث التطبيق', maintenance: 'صيانة', alert: 'تنبيه',
};

export function isInboxNotification(notification: Pick<InboxNotification, 'type'>): boolean {
  return Object.prototype.hasOwnProperty.call(notificationLabels, notification.type);
}

export function notificationDestination(type: string): ScreenName {
  return type === 'order_status' ? 'tracking' : 'notifications';
}

export function formatNotificationDate(value: string): string {
  // Database timestamps are UTC; some API serializers omit the timezone suffix.
  const utcValue = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  return formatOrderDate(utcValue);
}
