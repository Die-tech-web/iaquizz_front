import type {
  ProfessionalNotificationsResponse,
} from '../../../entities/notification/model/types';
import { httpClient } from '../../../shared/lib/http/httpClient';

export const notificationApi = {
  listMyNotifications(token: string, unreadOnly = false, limit = 20) {
    return httpClient.get<ProfessionalNotificationsResponse>('/notifications/me', {
      token,
      query: {
        unreadOnly: unreadOnly ? 'true' : undefined,
        limit: String(limit),
      },
    });
  },

  markAsRead(notificationId: string, token: string) {
    return httpClient.patch<undefined, { id: string; status: 'READ'; readAt: string }>(
      `/notifications/${notificationId}/read`,
      undefined,
      { token },
    );
  },

  markAllAsRead(token: string) {
    return httpClient.patch<undefined, { updatedCount: number; readAt: string }>(
      '/notifications/me/read-all',
      undefined,
      { token },
    );
  },
};
