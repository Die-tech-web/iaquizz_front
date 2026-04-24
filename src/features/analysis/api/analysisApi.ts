import type { QuizRecommendationV2Response } from '../../../entities/quiz/model/types';
import { httpClient } from '../../../shared/lib/http/httpClient';

interface RecommendationV2Params {
  patientId: string;
  token: string;
  dominantDisease?: string;
  limit?: number;
}

export const analysisApi = {
  recommendForPatientV2(params: RecommendationV2Params) {
    return httpClient.get<QuizRecommendationV2Response>(
      `/analysis/recommendations-v2/patient/${params.patientId}`,
      {
        token: params.token,
        query: {
          dominantDisease: params.dominantDisease,
          limit: params.limit ? String(params.limit) : undefined,
        },
      },
    );
  },
};
