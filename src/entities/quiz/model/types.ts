export type QuizQuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'BOOLEAN';

export interface QuizOption {
  code: string;
  label: string;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: string;
  linkId: string;
  text: string;
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
  score: number;
  status: string;
  completedAt: string;
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
