import { useEffect, useMemo, useState } from 'react';
import type { ProfessionalPatient } from '../../../entities/professional/model/types';
import type { QuizHistoryItem } from '../../../entities/quiz/model/types';
import type { QuizAdaptiveLevelResponse } from '../../../entities/quiz/model/types';
import { quizApi } from '../../quiz/api/quizApi';
import { professionalApi } from '../api/professionalApi';

export const useProfessionalDashboard = (token: string) => {
  const [patients, setPatients] = useState<ProfessionalPatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [insightByPatient, setInsightByPatient] = useState<Record<string, QuizAdaptiveLevelResponse>>(
    {},
  );
  const [patientInsightLoading, setPatientInsightLoading] = useState(false);
  const [savedQuizzesByPatient, setSavedQuizzesByPatient] = useState<Record<string, QuizHistoryItem[]>>(
    {},
  );
  const [savedQuizzesLoading, setSavedQuizzesLoading] = useState(false);
  const [savedQuizzesError, setSavedQuizzesError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPatients = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await professionalApi.listPatients(token);
        const normalizedPatients = response.map((patient) => ({
          ...patient,
          conditions: patient.conditions ?? [],
        }));
        setPatients(normalizedPatients);
        setSelectedPatientId((current) => {
          if (current && normalizedPatients.some((patient) => patient.id === current)) {
            return current;
          }
          return normalizedPatients[0]?.id ?? null;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chargement des patients impossible.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadPatients();
  }, [token]);

  useEffect(() => {
    const loadSelectedPatientInsight = async () => {
      if (!selectedPatientId || insightByPatient[selectedPatientId]) {
        return;
      }

      setPatientInsightLoading(true);
      try {
        const insight = await quizApi.adaptiveLevel(selectedPatientId, token);
        setInsightByPatient((current) => ({
          ...current,
          [selectedPatientId]: insight,
        }));
      } catch {
        // Keep dashboard usable even if this panel fails.
      } finally {
        setPatientInsightLoading(false);
      }
    };

    void loadSelectedPatientInsight();
  }, [insightByPatient, selectedPatientId, token]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );

  const selectedPatientInsight = selectedPatientId ? insightByPatient[selectedPatientId] ?? null : null;
  const selectedPatientSavedQuizzes = selectedPatientId
    ? savedQuizzesByPatient[selectedPatientId] ?? []
    : [];

  const loadPatientSavedQuizzes = async (patientId: string, force = false) => {
    if (!force && savedQuizzesByPatient[patientId]) {
      return savedQuizzesByPatient[patientId];
    }

    setSavedQuizzesLoading(true);
    setSavedQuizzesError(null);
    try {
      const items = await professionalApi.listPatientSavedQuizzes(patientId, token, 2);
      setSavedQuizzesByPatient((current) => ({
        ...current,
        [patientId]: items,
      }));
      return items;
    } catch (err) {
      setSavedQuizzesError(err instanceof Error ? err.message : 'Chargement des quiz enregistré impossible.');
      return [];
    } finally {
      setSavedQuizzesLoading(false);
    }
  };

  const refresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await professionalApi.listPatients(token);
      const normalizedPatients = response.map((patient) => ({
        ...patient,
        conditions: patient.conditions ?? [],
      }));
      setPatients(normalizedPatients);
      setSelectedPatientId((current) => {
        if (current && normalizedPatients.some((patient) => patient.id === current)) {
          return current;
        }
        return normalizedPatients[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Actualisation impossible.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    patients,
    selectedPatient,
    selectedPatientId,
    selectedPatientInsight,
    selectedPatientSavedQuizzes,
    patientInsightLoading,
    savedQuizzesLoading,
    isLoading,
    error,
    savedQuizzesError,
    setSelectedPatientId,
    refresh,
    loadPatientSavedQuizzes,
  };
};
