import type { PatientLanguage } from '../../../shared/lib/i18n/language';

export type AuthRole = 'PATIENT' | 'HEALTH_PROFESSIONAL';

export interface PatientSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profile: string;
  currentLevel?: string;
  preferredLanguage: PatientLanguage;
}

export interface ProfessionalSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  specialty?: string | null;
  facilityName?: string | null;
  licenseNumber?: string | null;
}

export interface PatientAuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  role: 'PATIENT';
  patient: PatientSummary;
}

export interface ProfessionalAuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  role: 'HEALTH_PROFESSIONAL';
  professional: ProfessionalSummary;
}

export type AuthResponse = PatientAuthResponse | ProfessionalAuthResponse;

export interface LoginPayload {
  email: string;
  password: string;
}
