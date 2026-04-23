import { useEffect, useState } from 'react';
import {
  fhirApi,
  type FhirQuestionnaire,
  type FhirQuestionnaireResponse,
} from '../api/fhirApi';

interface UseFhirExportParams {
  quizId?: string;
  attemptId?: string;
}

export const useFhirExport = ({ quizId, attemptId }: UseFhirExportParams) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionnaire, setQuestionnaire] = useState<FhirQuestionnaire | null>(null);
  const [questionnaireResponse, setQuestionnaireResponse] =
    useState<FhirQuestionnaireResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!quizId) {
        setQuestionnaire(null);
        setQuestionnaireResponse(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const q = await fhirApi.getQuestionnaire(quizId);
        setQuestionnaire(q);

        if (attemptId) {
          const qr = await fhirApi.getQuestionnaireResponse(attemptId);
          setQuestionnaireResponse(qr);
        } else {
          setQuestionnaireResponse(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Export FHIR impossible.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [quizId, attemptId]);

  return {
    isLoading,
    error,
    questionnaire,
    questionnaireResponse,
  };
};
