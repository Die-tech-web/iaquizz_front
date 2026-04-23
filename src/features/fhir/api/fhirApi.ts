import { httpClient } from '../../../shared/lib/http/httpClient';

export interface FhirQuestionnaire {
  resourceType: 'Questionnaire';
  id: string;
  [key: string]: unknown;
}

export interface FhirQuestionnaireResponse {
  resourceType: 'QuestionnaireResponse';
  id: string;
  [key: string]: unknown;
}

export const fhirApi = {
  getQuestionnaire(quizId: string) {
    return httpClient.get<FhirQuestionnaire>(`/fhir/questionnaire/${quizId}`);
  },

  getQuestionnaireResponse(attemptId: string) {
    return httpClient.get<FhirQuestionnaireResponse>(
      `/fhir/questionnaire-response/${attemptId}`,
    );
  },
};
