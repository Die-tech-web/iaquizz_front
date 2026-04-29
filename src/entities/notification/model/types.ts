import type { PatientLanguage } from '../../../shared/lib/i18n/language';

export type NotificationType = 'QUIZ_CRITICAL';
export type NotificationStatus = 'UNREAD' | 'READ';

export interface ProfessionalNotificationPatient {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  currentLevel: string;
  preferredLanguage: PatientLanguage;
}

export interface ProfessionalNotificationItem {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  scoreOnTen: number;
  actionLink: string | null;
  createdAt: string;
  readAt: string | null;
  patient: ProfessionalNotificationPatient;
  attemptId: string | null;
}

export interface ProfessionalNotificationsResponse {
  unreadCount: number;
  items: ProfessionalNotificationItem[];
}
