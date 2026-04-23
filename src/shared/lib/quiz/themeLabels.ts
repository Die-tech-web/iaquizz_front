const THEME_LABELS: Record<string, string> = {
  FOLLOW_UP: 'Suivi',
  RISK_FACTORS: 'Facteurs de risque',
  PREVENTION: 'Prévention',
  ADHERENCE: 'Adhérence thérapeutique',
  TREATMENT: 'Traitement',
  NUTRITION: 'Nutrition',
  LIFESTYLE: 'Mode de vie',
  COMPLICATIONS: 'Complications',
};

export const getThemeLabel = (theme: string) => THEME_LABELS[theme] ?? theme;
