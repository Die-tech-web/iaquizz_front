import type { PatientLanguage } from '../../../shared/lib/i18n/language';

export interface PatientSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profile: string;
  currentLevel?: string;
  preferredLanguage: PatientLanguage;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  patient: PatientSummary;
}

export interface LoginPayload {
  email: string;
  password: string;
}
