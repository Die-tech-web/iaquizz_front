import type {
  QuizAdaptiveLevelResponse,
  QuizAttemptResponse,
  QuizHistoryItem,
  QuizItem,
  QuizRecommendedResponse,
  QuizThemeCoverage,
  SubmittedAnswer,
} from '../../../entities/quiz/model/types';
import type { PatientLanguage } from '../../../shared/lib/i18n/language';
import { httpClient } from '../../../shared/lib/http/httpClient';

interface SubmitQuizPayload {
  patientId: string;
  quizId: string;
  submittedBy: string;
  language: PatientLanguage;
  answers: SubmittedAnswer[];
}

interface QuizFilters {
  patientProfile?: string;
  patientId?: string;
  mainDisease?: string;
  lang?: PatientLanguage;
}

interface SaveQuizAttemptPayload {
  patientId: string;
}

export const quizApi = {
  list(filters: QuizFilters) {
    return httpClient.get<QuizItem[]>('/quizzes', {
      query: {
        patientProfile: filters.patientProfile,
        patientId: filters.patientId,
        mainDisease: filters.mainDisease,
        lang: filters.lang,
      },
    });
  },

  coverage() {
    return httpClient.get<QuizThemeCoverage>('/quizzes/catalog/coverage');
  },

  adaptiveLevel(patientId: string, token: string) {
    return httpClient.get<QuizAdaptiveLevelResponse>(
      `/quizzes/backoffice/patient/${patientId}/adaptive-level`,
      { token },
    );
  },

  recommended(patientId: string, token: string, mainDisease?: string, lang?: PatientLanguage) {
    return httpClient.get<QuizRecommendedResponse>(
      `/quizzes/recommended/patient/${patientId}`,
      {
        token,
        query: {
          mainDisease,
          lang,
        },
      },
    );
  },

  submit(payload: SubmitQuizPayload, token: string) {
    return httpClient.post<SubmitQuizPayload, QuizAttemptResponse>(
      '/quizzes/submit',
      payload,
      { token },
    );
  },

  saveAttempt(attemptId: string, payload: SaveQuizAttemptPayload, token: string) {
    return httpClient.post<SaveQuizAttemptPayload, QuizHistoryItem>(
      `/quizzes/attempts/${attemptId}/save`,
      payload,
      { token },
    );
  },

  listSavedAttempts(patientId: string, token: string, limit = 50) {
    return httpClient.get<QuizHistoryItem[]>(
      `/quizzes/patient/${patientId}/saved-attempts`,
      {
        token,
        query: { limit: String(limit) },
      },
    );
  },
};
