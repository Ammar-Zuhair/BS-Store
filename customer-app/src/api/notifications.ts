import { api } from './client';
import type { InboxNotification } from '../utils/notificationInbox';

export interface NotificationPage {
  items: InboxNotification[];
  hasMore: boolean;
  unreadCount: number;
}

export const notificationsApi = {
  getInbox: (page = 1) => api.get<NotificationPage>(`/notifications?inboxOnly=true&page=${page}&pageSize=30`),
};
