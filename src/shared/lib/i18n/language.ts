export const PATIENT_LANGUAGES = ['fr', 'en', 'wo'] as const;

export type PatientLanguage = (typeof PATIENT_LANGUAGES)[number];

export const DEFAULT_PATIENT_LANGUAGE: PatientLanguage = 'fr';

export const resolvePatientLanguage = (value?: string | null): PatientLanguage => {
  if (!value) {
    return DEFAULT_PATIENT_LANGUAGE;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'en') {
    return 'en';
  }
  if (normalized === 'wo') {
    return 'wo';
  }

  return 'fr';
};

export const getSpeechSynthesisLanguage = (language: PatientLanguage) =>
  language === 'en' ? 'en-US' : language === 'wo' ? 'wo-SN' : 'fr-FR';

export const getLanguageLabel = (language: PatientLanguage) =>
  language === 'en' ? 'English' : language === 'wo' ? 'Wolof' : 'Français';
