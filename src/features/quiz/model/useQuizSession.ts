import { useEffect, useMemo, useState } from 'react';
import type { PatientAuthResponse } from '../../../entities/auth/model/types';
import type {
  QuizAdaptiveLevelResponse,
  QuizAttemptResponse,
  QuizHistoryItem,
  QuizItem,
  QuizRecommendationV2Item,
  QuizRecommendationV2Response,
  QuizQuestion,
  QuizThemeCoverage,
  SubmittedAnswer,
} from '../../../entities/quiz/model/types';
import { patientApi } from '../../patient/api/patientApi';
import { analysisApi } from '../../analysis/api/analysisApi';
import { quizApi } from '../api/quizApi';
import {
  DEFAULT_PATIENT_LANGUAGE,
  type PatientLanguage,
  resolvePatientLanguage,
} from '../../../shared/lib/i18n/language';

interface AnswerFeedback {
  isCorrect: boolean;
  explanation: string;
}

interface LevelUpNotice {
  fromLevel: string;
  toLevel: string;
}

interface ProgressToast {
  type: 'success' | 'warning' | 'info';
  message: string;
  duration: number;
}

const RECOMMENDATION_LIMIT = 10;
const MAX_QUESTIONS_PER_QUIZ = 10;

const toSignature = (values: string[]) => values.slice().sort().join('|');

const isCorrectAnswer = (question: QuizQuestion, selectedValues: string[]) => {
  const expected = question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.code);
  return toSignature(expected) === toSignature(selectedValues);
};

const trimQuizQuestions = (quiz: QuizItem): QuizItem => ({
  ...quiz,
  questions: quiz.questions.slice(0, MAX_QUESTIONS_PER_QUIZ),
});

const evaluate = (question: QuizQuestion, selected: string[]): AnswerFeedback => {
  const isCorrect = isCorrectAnswer(question, selected);
  const correctLabels = question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.label);
  const selectedLabels = question.options
    .filter((option) => selected.includes(option.code))
    .map((option) => option.label);
  const selectedText = selectedLabels.length ? selectedLabels.join(' / ') : 'Aucune option';
  const expectedText = correctLabels.join(' / ');

  return {
    isCorrect,
    explanation: isCorrect
      ? `Bonne réponse. Votre sélection: ${selectedText}. Cette réponse est cohérente avec les recommandations générales de suivi.`
      : `Votre sélection: ${selectedText}. Réponse attendue: ${expectedText}. Cette indication reste informative et doit être confirmée avec un professionnel de santé.`,
  };
};

const orderQuizzesByRecommendations = (
  quizzes: QuizItem[],
  recommendation: QuizRecommendationV2Response | null,
) => {
  const recommendedIds = recommendation?.recommendations.map((item) => item.quizId) ?? [];
  if (!recommendedIds.length) {
    return quizzes;
  }

  const quizById = new Map(quizzes.map((item) => [item.id, item] as const));
  const prioritized: QuizItem[] = [];
  const prioritizedIds = new Set<string>();

  recommendedIds.forEach((quizId) => {
    const matched = quizById.get(quizId);
    if (matched && !prioritizedIds.has(quizId)) {
      prioritized.push(matched);
      prioritizedIds.add(quizId);
    }
  });

  const rankedIds = new Set(prioritized.map((item) => item.id));
  const remaining = quizzes.filter((item) => !rankedIds.has(item.id));

  return [...prioritized, ...remaining];
};

const toRecommendationMap = (recommendation: QuizRecommendationV2Response | null) => {
  const map: Record<string, QuizRecommendationV2Item> = {};
  (recommendation?.recommendations ?? []).forEach((item) => {
    map[item.quizId] = item;
  });
  return map;
};

export const useQuizSession = (auth: PatientAuthResponse | null) => {
  const [quizPool, setQuizPool] = useState<QuizItem[]>([]);
  const [recommendationMap, setRecommendationMap] = useState<
    Record<string, QuizRecommendationV2Item>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizItem | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draftSelection, setDraftSelection] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [attempt, setAttempt] = useState<QuizAttemptResponse | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [totalQuestionsInRun, setTotalQuestionsInRun] = useState(0);
  const [sessionQuizIds, setSessionQuizIds] = useState<string[]>([]);
  const [sessionQuizCursor, setSessionQuizCursor] = useState(0);
  const [isRunCompleted, setIsRunCompleted] = useState(false);
  const [themeCoverage, setThemeCoverage] = useState<QuizThemeCoverage | null>(null);
  const [levelUpNotice, setLevelUpNotice] = useState<LevelUpNotice | null>(null);
  const [perfectScoreNotice, setPerfectScoreNotice] = useState<string | null>(null);
  const [progressToast, setProgressToast] = useState<ProgressToast | null>(null);
  const [adaptiveLevelDecision, setAdaptiveLevelDecision] = useState<QuizAdaptiveLevelResponse | null>(
    null,
  );
  const [savedHistory, setSavedHistory] = useState<QuizHistoryItem[]>([]);
  const [isSavingAttempt, setIsSavingAttempt] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [saveAttemptError, setSaveAttemptError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isCurrentAttemptSaved, setIsCurrentAttemptSaved] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<PatientLanguage>(
    DEFAULT_PATIENT_LANGUAGE,
  );

  const getPlayCountStorageKey = (patientId: string) => `akacare_quiz_play_counts_${patientId}`;
  const getLanguageStorageKey = (patientId: string) => `akacare_quiz_lang_${patientId}`;

  const readPlayCounts = (patientId: string) => {
    try {
      const raw = window.localStorage.getItem(getPlayCountStorageKey(patientId));
      if (!raw) {
        return {} as Record<string, number>;
      }
      const parsed = JSON.parse(raw) as Record<string, number>;
      return Object.entries(parsed).reduce<Record<string, number>>((acc, [quizId, count]) => {
        acc[quizId] = Number.isFinite(count) && count > 0 ? count : 0;
        return acc;
      }, {});
    } catch {
      return {};
    }
  };

  const writePlayCounts = (patientId: string, counts: Record<string, number>) => {
    window.localStorage.setItem(getPlayCountStorageKey(patientId), JSON.stringify(counts));
  };

  const readStoredLanguage = (patientId: string, fallbackLanguage?: string) => {
    const fallback = resolvePatientLanguage(fallbackLanguage);
    try {
      const raw = window.localStorage.getItem(getLanguageStorageKey(patientId));
      return resolvePatientLanguage(raw ?? fallback);
    } catch {
      return fallback;
    }
  };

  const writeStoredLanguage = (patientId: string, language: PatientLanguage) => {
    window.localStorage.setItem(getLanguageStorageKey(patientId), language);
  };

  const getNextQuiz = (pool: QuizItem[], patientId: string, currentQuizId?: string): QuizItem => {
    if (pool.length === 0) {
      throw new Error('No quiz available');
    }

    const counts = readPlayCounts(patientId);
    const sorted = [...pool].sort((left, right) => {
      const leftCount = counts[left.id] ?? 0;
      const rightCount = counts[right.id] ?? 0;
      if (leftCount !== rightCount) {
        return leftCount - rightCount;
      }
      return left.title.localeCompare(right.title);
    });

    return sorted.find((quiz) => quiz.id !== currentQuizId) ?? sorted[0];
  };

  const registerQuizPlay = (patientId: string, quizId: string) => {
    const counts = readPlayCounts(patientId);
    counts[quizId] = (counts[quizId] ?? 0) + 1;
    writePlayCounts(patientId, counts);
  };

  const fetchEffectiveQuizzes = async (language: PatientLanguage) => {
    if (!auth) {
      return {
        quizzes: [] as QuizItem[],
        coverage: null as QuizThemeCoverage | null,
        recommendationMap: {} as Record<string, QuizRecommendationV2Item>,
        adaptiveLevelDecision: null as QuizAdaptiveLevelResponse | null,
      };
    }

    const [recommendedResult, coverageResult, recommendationResult] = await Promise.allSettled([
      quizApi.recommended(auth.patient.id, auth.accessToken, undefined, language),
      quizApi.coverage(),
      analysisApi.recommendForPatientV2({
        patientId: auth.patient.id,
        token: auth.accessToken,
        limit: RECOMMENDATION_LIMIT,
      }),
    ]);

    const coverage = coverageResult.status === 'fulfilled' ? coverageResult.value : null;
    if (recommendedResult.status !== 'fulfilled') {
      throw recommendedResult.reason;
    }

    const quizzes = recommendedResult.value.recommendations.map(trimQuizQuestions);
    const recommendation =
      recommendationResult.status === 'fulfilled' ? recommendationResult.value : null;
    const effectiveQuizzes = orderQuizzesByRecommendations(quizzes, recommendation);
    const recommendationMap = toRecommendationMap(recommendation);
    const adaptiveLevelDecision: QuizAdaptiveLevelResponse = {
      currentLevel: recommendedResult.value.currentLevel,
      recommendedLevel: recommendedResult.value.currentLevel,
      currentModule: recommendedResult.value.currentModule,
      nextLevel: recommendedResult.value.nextLevel,
      progressionPercentage: recommendedResult.value.progressionPercentage,
      perfectScoresAtCurrentLevel: recommendedResult.value.perfectScoresAtCurrentLevel,
      requiredPerfectScoresForNextLevel: recommendedResult.value.requiredPerfectScoresForNextLevel,
      remainingPerfectScoresToUnlock: recommendedResult.value.remainingPerfectScoresToUnlock,
      completedAttempts: 0,
      overallSuccessRate: 0,
      perfectScoresByLevel: {},
      nextObjective: null,
      rationale: '',
    };

    return {
      quizzes: effectiveQuizzes,
      coverage,
      recommendationMap,
      adaptiveLevelDecision,
    };
  };

  useEffect(() => {
    if (!auth) {
      setSelectedLanguage(DEFAULT_PATIENT_LANGUAGE);
      return;
    }

    const preferredLanguage = readStoredLanguage(
      auth.patient.id,
      auth.patient.preferredLanguage,
    );
    setSelectedLanguage(preferredLanguage);
  }, [auth]);

  useEffect(() => {
    const load = async () => {
      if (!auth) {
        setQuizPool([]);
        setQuiz(null);
        setCurrentIndex(0);
        setAnswers({});
        setDraftSelection([]);
        setFeedback(null);
        setAttempt(null);
        setError(null);
        setHasStarted(false);
        setCorrectAnswersCount(0);
        setTotalQuestionsInRun(0);
        setSessionQuizIds([]);
        setSessionQuizCursor(0);
        setIsRunCompleted(false);
        setThemeCoverage(null);
        setRecommendationMap({});
        setLevelUpNotice(null);
        setPerfectScoreNotice(null);
        setProgressToast(null);
        setAdaptiveLevelDecision(null);
        setSavedHistory([]);
        setIsSavingAttempt(false);
        setIsHistoryLoading(false);
        setSaveAttemptError(null);
        setHistoryError(null);
        setIsCurrentAttemptSaved(false);
        setSelectedLanguage(DEFAULT_PATIENT_LANGUAGE);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const {
          quizzes: effectiveQuizzes,
          coverage,
          recommendationMap: nextRecommendationMap,
          adaptiveLevelDecision: nextAdaptiveLevelDecision,
        } = await fetchEffectiveQuizzes(selectedLanguage);
        setThemeCoverage(coverage);
        setRecommendationMap(nextRecommendationMap);
        setAdaptiveLevelDecision(nextAdaptiveLevelDecision);

        if (!effectiveQuizzes.length) {
          setQuiz(null);
          setError('Aucun quiz disponible pour ce profil.');
          return;
        }

        setQuizPool(effectiveQuizzes);
        setQuiz(getNextQuiz(effectiveQuizzes, auth.patient.id));
        setHasStarted(false);
        setCorrectAnswersCount(0);
        setTotalQuestionsInRun(0);
        setSessionQuizIds([]);
        setSessionQuizCursor(0);
        setIsRunCompleted(false);
        setSavedHistory([]);
        setSaveAttemptError(null);
        setHistoryError(null);
        setIsCurrentAttemptSaved(false);
        setProgressToast(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chargement quiz impossible.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [auth, selectedLanguage]);

  const currentQuestion = useMemo(() => {
    if (!quiz) {
      return null;
    }

    return quiz.questions[currentIndex] ?? null;
  }, [quiz, currentIndex]);

  const start = async (quizIds?: string[]) => {
    let pool = quizPool;

    if (auth) {
      try {
        const {
          quizzes: refreshedQuizzes,
          coverage,
          recommendationMap: refreshedRecommendationMap,
          adaptiveLevelDecision: refreshedAdaptiveLevelDecision,
        } = await fetchEffectiveQuizzes(selectedLanguage);
        if (refreshedQuizzes.length > 0) {
          pool = refreshedQuizzes;
          setQuizPool(refreshedQuizzes);
          setThemeCoverage(coverage);
          setRecommendationMap(refreshedRecommendationMap);
          setAdaptiveLevelDecision(refreshedAdaptiveLevelDecision);
        }
      } catch {
        // Fallback to current in-memory pool if refresh fails.
      }
    }

    if (!pool.length) {
      return;
    }

    const uniqueIds = quizIds?.length
      ? Array.from(new Set(quizIds.filter((id) => pool.some((item) => item.id === id))))
      : [];

    const runIds =
      uniqueIds.length > 0
        ? [uniqueIds[0]]
        : hasStarted && auth
          ? [getNextQuiz(pool, auth.patient.id, quiz?.id).id]
          : quiz
            ? [quiz.id]
            : [pool[0].id];

    const selectedQuizId = quiz?.id && runIds.includes(quiz.id) ? quiz.id : runIds[0];
    const selectedQuiz = pool.find((item) => item.id === selectedQuizId) ?? pool[0];
    const cursor = Math.max(runIds.indexOf(selectedQuiz.id), 0);

    const totalQuestions = runIds.reduce((sum, runId) => {
      const runQuiz = pool.find((item) => item.id === runId);
      return sum + (runQuiz?.questions.length ?? 0);
    }, 0);

    if (auth && selectedQuiz?.id) {
      registerQuizPlay(auth.patient.id, selectedQuiz.id);
    }

    setQuiz(selectedQuiz);
    setSessionQuizIds(runIds);
    setSessionQuizCursor(cursor);
    setTotalQuestionsInRun(totalQuestions);
    setIsRunCompleted(false);
    setHasStarted(true);
    setCurrentIndex(0);
    setDraftSelection([]);
    setAnswers({});
    setFeedback(null);
    setAttempt(null);
    setError(null);
    setCorrectAnswersCount(0);
    setLevelUpNotice(null);
    setPerfectScoreNotice(null);
    setProgressToast(null);
    setSaveAttemptError(null);
    setHistoryError(null);
    setIsCurrentAttemptSaved(false);
  };

  const selectQuiz = (quizId: string) => {
    const selectedQuiz = quizPool.find((item) => item.id === quizId);
    if (!selectedQuiz) {
      return;
    }

    setQuiz(selectedQuiz);
    setHasStarted(false);
    setCurrentIndex(0);
    setDraftSelection([]);
    setAnswers({});
    setFeedback(null);
    setAttempt(null);
    setError(null);
    setCorrectAnswersCount(0);
    setTotalQuestionsInRun(0);
    setSessionQuizIds([]);
    setSessionQuizCursor(0);
    setIsRunCompleted(false);
    setPerfectScoreNotice(null);
    setProgressToast(null);
    setSaveAttemptError(null);
    setHistoryError(null);
    setIsCurrentAttemptSaved(false);
  };

  const changeLanguage = (language: PatientLanguage) => {
    const resolvedLanguage = resolvePatientLanguage(language);
    if (resolvedLanguage === selectedLanguage) {
      return;
    }

    setSelectedLanguage(resolvedLanguage);
    setHasStarted(false);
    setCurrentIndex(0);
    setDraftSelection([]);
    setAnswers({});
    setFeedback(null);
    setAttempt(null);
    setError(null);
    setCorrectAnswersCount(0);
    setTotalQuestionsInRun(0);
    setSessionQuizIds([]);
    setSessionQuizCursor(0);
    setIsRunCompleted(false);
    setLevelUpNotice(null);
    setPerfectScoreNotice(null);
    setProgressToast(null);
    setSaveAttemptError(null);
    setHistoryError(null);
    setIsCurrentAttemptSaved(false);

    if (!auth) {
      return;
    }

    writeStoredLanguage(auth.patient.id, resolvedLanguage);
    void patientApi
      .updatePreferredLanguage(auth.patient.id, resolvedLanguage, auth.accessToken)
      .catch(() => undefined);
  };

  const toggleOption = (optionCode: string) => {
    if (!currentQuestion || feedback) {
      return;
    }

    if (currentQuestion.type === 'MULTIPLE_CHOICE') {
      setDraftSelection((prev) =>
        prev.includes(optionCode)
          ? prev.filter((item) => item !== optionCode)
          : [...prev, optionCode],
      );
      return;
    }

    setDraftSelection([optionCode]);
  };

  const validateCurrentAnswer = () => {
    if (!currentQuestion || draftSelection.length === 0 || feedback) {
      return;
    }

    const result = evaluate(currentQuestion, draftSelection);
    setFeedback(result);
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: draftSelection }));
    if (result.isCorrect) {
      setCorrectAnswersCount((value) => value + 1);
    }
  };

  const submitQuiz = async (payloadAnswers: SubmittedAnswer[]) => {
    if (!auth || !quiz) {
      return null;
    }

    return quizApi.submit(
      {
        patientId: auth.patient.id,
        quizId: quiz.id,
        submittedBy: 'web-akacare-front',
        language: selectedLanguage,
        answers: payloadAnswers,
      },
      auth.accessToken,
    );
  };

  const goNext = async () => {
    if (!quiz || !currentQuestion || !feedback) {
      return;
    }

    const isLastQuestion = currentIndex >= quiz.questions.length - 1;

    if (isLastQuestion) {
      const mergedAnswers: Record<string, string[]> = {
        ...answers,
      };
      if (!mergedAnswers[currentQuestion.id]?.length && draftSelection.length > 0) {
        mergedAnswers[currentQuestion.id] = draftSelection;
      }

      const payloadAnswers: SubmittedAnswer[] = quiz.questions
        .map((question) => ({
          questionId: question.id,
          value: mergedAnswers[question.id] ?? [],
        }))
        .filter((item) => item.value.length > 0);

      setIsLoading(true);
      setError(null);
      try {
        const submittedAttempt = await submitQuiz(payloadAnswers);
        if (!submittedAttempt) {
          return;
        }

        const localCorrectAnswers = quiz.questions.reduce((count, item) => {
          const selectedValues = mergedAnswers[item.id] ?? [];
          if (selectedValues.length === 0) {
            return count;
          }
          return isCorrectAnswer(item, selectedValues) ? count + 1 : count;
        }, 0);
        const localTotalQuestions = Math.max(quiz.questions.length, 1);
        const localScoreOnTen = Number(((localCorrectAnswers / localTotalQuestions) * 10).toFixed(2));
        const resolvedScoreOnTen =
          submittedAttempt.scoreOnTen === 0 && localCorrectAnswers > 0
            ? localScoreOnTen
            : submittedAttempt.scoreOnTen;

        setAttempt({
          ...submittedAttempt,
          scoreOnTen: resolvedScoreOnTen,
          correctAnswersCount:
            submittedAttempt.correctAnswersCount ?? localCorrectAnswers,
          totalQuestionsCount:
            submittedAttempt.totalQuestionsCount ?? localTotalQuestions,
        });
        setIsCurrentAttemptSaved(false);
        setSaveAttemptError(null);

        setPerfectScoreNotice(null);

        if (submittedAttempt.toast) {
          setProgressToast(submittedAttempt.toast);
        } else {
          setProgressToast(null);
        }

        setAdaptiveLevelDecision((previous) => ({
          currentLevel: submittedAttempt.currentLevel,
          recommendedLevel: submittedAttempt.currentLevel,
          currentModule: submittedAttempt.currentModule,
          nextLevel: submittedAttempt.nextLevel,
          progressionPercentage: submittedAttempt.progressionPercentage,
          perfectScoresAtCurrentLevel: submittedAttempt.perfectScoresAtCurrentLevel,
          requiredPerfectScoresForNextLevel: submittedAttempt.requiredPerfectScoresForNextLevel,
          remainingPerfectScoresToUnlock: submittedAttempt.remainingPerfectScoresToUnlock,
          completedAttempts: previous?.completedAttempts ?? 0,
          overallSuccessRate: previous?.overallSuccessRate ?? 0,
          perfectScoresByLevel: previous?.perfectScoresByLevel ?? {},
          nextObjective: submittedAttempt.nextLevel
            ? `Validez le module en cours avec au moins 8/10 pour continuer la progression.`
            : null,
          rationale: previous?.rationale ?? '',
        }));
        if (submittedAttempt.levelChanged && submittedAttempt.previousLevel) {
          setLevelUpNotice({
            fromLevel: submittedAttempt.previousLevel,
            toLevel: submittedAttempt.currentLevel,
          });
        } else {
          setLevelUpNotice(null);
        }

        const hasNextQuiz = sessionQuizCursor < sessionQuizIds.length - 1;
        if (hasNextQuiz) {
          const nextQuizId = sessionQuizIds[sessionQuizCursor + 1];
          const nextQuiz = quizPool.find((item) => item.id === nextQuizId);
          if (nextQuiz) {
            setQuiz(nextQuiz);
            setSessionQuizCursor((value) => value + 1);
            setCurrentIndex(0);
            setDraftSelection([]);
            setAnswers({});
            setFeedback(null);
            return;
          }
        }

        setIsRunCompleted(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Soumission quiz impossible.');
      } finally {
        setIsLoading(false);
      }

      return;
    }

    setCurrentIndex((value) => value + 1);
    setDraftSelection([]);
    setFeedback(null);
  };

  const backToModules = () => {
    setIsRunCompleted(false);
    setAttempt(null);
    setHasStarted(false);
    setCurrentIndex(0);
    setDraftSelection([]);
    setAnswers({});
    setFeedback(null);
    setError(null);
    setCorrectAnswersCount(0);
    setTotalQuestionsInRun(0);
    setSessionQuizIds([]);
    setSessionQuizCursor(0);
    setLevelUpNotice(null);
    setPerfectScoreNotice(null);
    setProgressToast(null);
    setSaveAttemptError(null);
    setHistoryError(null);
    setIsCurrentAttemptSaved(false);
  };

  const saveCurrentAttempt = async () => {
    if (!auth || !attempt) {
      return null;
    }

    if (isCurrentAttemptSaved) {
      return null;
    }

    setIsSavingAttempt(true);
    setSaveAttemptError(null);
    try {
      const saved = await quizApi.saveAttempt(
        attempt.id,
        { patientId: auth.patient.id },
        auth.accessToken,
      );
      setIsCurrentAttemptSaved(true);
      setSavedHistory((previous) => {
        const withoutCurrent = previous.filter((item) => item.attemptId !== saved.attemptId);
        return [saved, ...withoutCurrent];
      });
      return saved;
    } catch (err) {
      setSaveAttemptError(err instanceof Error ? err.message : 'Sauvegarde impossible.');
      return null;
    } finally {
      setIsSavingAttempt(false);
    }
  };

  const loadSavedAttempts = async (limit = 50) => {
    if (!auth) {
      return [];
    }

    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const history = await quizApi.listSavedAttempts(auth.patient.id, auth.accessToken, limit);
      setSavedHistory(history);
      return history;
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Chargement historique impossible.');
      return [];
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!progressToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setProgressToast(null);
    }, progressToast.duration);

    return () => window.clearTimeout(timeoutId);
  }, [progressToast]);

  return {
    quizPool,
    recommendationMap,
    themeCoverage,
    quiz,
    currentIndex,
    currentQuestion,
    draftSelection,
    feedback,
    isLoading,
    error,
    attempt,
    levelUpNotice,
    perfectScoreNotice,
    progressToast,
    savedHistory,
    isSavingAttempt,
    isHistoryLoading,
    saveAttemptError,
    historyError,
    isCurrentAttemptSaved,
    adaptiveLevelDecision,
    selectedLanguage,
    isRunCompleted,
    totalQuestionsInRun,
    sessionQuizCursor,
    sessionQuizTotal: sessionQuizIds.length || 1,
    correctAnswersCount,
    start,
    changeLanguage,
    selectQuiz,
    toggleOption,
    validateCurrentAnswer,
    goNext,
    backToModules,
    saveCurrentAttempt,
    loadSavedAttempts,
  };
};
