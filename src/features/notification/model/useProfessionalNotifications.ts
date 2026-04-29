import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProfessionalNotificationItem } from '../../../entities/notification/model/types';
import { notificationApi } from '../api/notificationApi';

export const useProfessionalNotifications = (token: string) => {
  const [items, setItems] = useState<ProfessionalNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await notificationApi.listMyNotifications(token, false, 2);
      setItems(response.items);
      setUnreadCount(response.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement notifications impossible.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await notificationApi.markAsRead(notificationId, token);
        setItems((current) =>
          current.map((item) =>
            item.id === notificationId
              ? { ...item, status: 'READ', readAt: new Date().toISOString() }
              : item,
          ),
        );
        setUnreadCount((count) => Math.max(count - 1, 0));
      } catch {
        // Avoid blocking UX for a non-critical UI action.
      }
    },
    [token],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead(token);
      setItems((current) =>
        current.map((item) =>
          item.status === 'UNREAD'
            ? { ...item, status: 'READ', readAt: new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount(0);
    } catch {
      // Do not block dashboard if this helper action fails.
    }
  }, [token]);

  return useMemo(
    () => ({
      items,
      unreadCount,
      isLoading,
      error,
      load,
      markAsRead,
      markAllAsRead,
    }),
    [error, isLoading, items, load, markAllAsRead, markAsRead, unreadCount],
  );
};
