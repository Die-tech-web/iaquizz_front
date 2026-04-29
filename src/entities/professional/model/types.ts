import type { QuizAdaptiveLevelResponse } from '../../../entities/quiz/model/types';
import type { PatientLanguage } from '../../../shared/lib/i18n/language';

export interface ProfessionalPatientCondition {
  id: string;
  key: string;
  title: string;
}

export interface ProfessionalPatient {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  profile: string;
  currentLevel: string;
  preferredLanguage: PatientLanguage;
  conditions: ProfessionalPatientCondition[];
}

export interface ProfessionalDashboardState {
  patients: ProfessionalPatient[];
  selectedPatientId: string | null;
  selectedPatientInsight: QuizAdaptiveLevelResponse | null;
  patientInsightLoading: boolean;
  isLoading: boolean;
  error: string | null;
}
