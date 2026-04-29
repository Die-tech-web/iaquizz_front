import type { ProfessionalPatient } from '../../../entities/professional/model/types';
import type { QuizHistoryItem } from '../../../entities/quiz/model/types';
import { httpClient } from '../../../shared/lib/http/httpClient';

export const professionalApi = {
  listPatients(token: string) {
    return httpClient.get<ProfessionalPatient[]>('/patients/professional-dashboard', { token });
  },

  listPatientSavedQuizzes(patientId: string, token: string, limit = 2) {
    return httpClient.get<QuizHistoryItem[]>(
      `/quizzes/professional/patient/${patientId}/saved-attempts`,
      {
        token,
        query: { limit: String(limit) },
      },
    );
  },
};
