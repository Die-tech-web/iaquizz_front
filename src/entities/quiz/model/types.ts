import type { PatientLanguage } from '../../../shared/lib/i18n/language';

export type QuizQuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'BOOLEAN';

export interface QuizOption {
  code: string;
  label: string;
  isCorrect?: boolean;
  imageUrl?: string | null;
  imageAlt?: string | null;
}

export interface QuizQuestion {
  id: string;
  linkId: string;
  text: string;
  promptText?: string | null;
  ttsText?: string;
  audioText?: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  isSensitiveMedical?: boolean;
  type: QuizQuestionType;
  options: QuizOption[];
  weight: number;
}

export interface QuizItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  level: string;
  themes?: string[];
  questions: QuizQuestion[];
}

export interface SubmittedAnswer {
  questionId: string;
  value: string[];
}

export interface QuizAttemptResponse {
  id: string;
  language: PatientLanguage;
  score: number;
  maxScore: number;
  scoreOnTen: number;
  correctAnswersCount?: number;
  totalQuestionsCount?: number;
  status: string;
  completedAt: string;
  levelAtAttempt: string;
  currentLevel: string;
  nextLevel: string | null;
  progressionPercentage: number;
  perfectScoresAtCurrentLevel: number;
  requiredPerfectScoresForNextLevel: number;
  remainingPerfectScoresToUnlock: number;
  levelChanged: boolean;
  previousLevel: string | null;
  congratulationMessage: string | null;
}

export interface QuizHistoryAnswer {
  questionId: string;
  questionText: string;
  selectedCodes: string[];
  selectedLabels: string[];
  correctCodes: string[];
  correctLabels: string[];
  isCorrect: boolean;
}

export interface QuizHistoryItem {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  language: PatientLanguage;
  savedAt: string;
  completedAt: string | null;
  scoreOnTen: number;
  levelAtAttempt: string;
  answers: QuizHistoryAnswer[];
}

export interface QuizThemeCoverageItem {
  theme: string;
  count: number;
  minimumExpected: number;
  isCompliant: boolean;
}

export interface QuizThemeCoverage {
  minimumExpected: number;
  totalPublishedQuizzes: number;
  isCompliant: boolean;
  themes: QuizThemeCoverageItem[];
}

export interface QuizRecommendationV2Item {
  quizId: string;
  title: string;
  level: string;
  mainTopic: string;
  relatedTopics: string[];
  targetProfiles: string[];
  relevanceScore: number;
  scoreHint: number;
  reasons: string[];
  matchedTopics: string[];
}

export interface QuizRecommendationV2Response {
  patientId: string;
  patientProfile: string;
  dominantDisease: string | null;
  generatedAt: string;
  totalCandidates: number;
  recommendations: QuizRecommendationV2Item[];
}

export interface QuizAdaptiveLevelStats {
  completedCount: number;
  averageSuccessRate: number;
  recentSuccessRate: number;
}

export interface QuizAdaptiveLevelResponse {
  currentLevel: string;
  recommendedLevel: string;
  nextLevel: string | null;
  progressionPercentage: number;
  perfectScoresAtCurrentLevel: number;
  requiredPerfectScoresForNextLevel: number;
  remainingPerfectScoresToUnlock: number;
  completedAttempts: number;
  overallSuccessRate: number;
  perfectScoresByLevel: Record<string, number>;
  nextObjective: string | null;
  rationale: string;
}

export interface QuizRecommendedResponse {
  patientId: string;
  currentLevel: string;
  nextLevel: string | null;
  progressionPercentage: number;
  perfectScoresAtCurrentLevel: number;
  requiredPerfectScoresForNextLevel: number;
  remainingPerfectScoresToUnlock: number;
  recommendations: QuizItem[];
}
