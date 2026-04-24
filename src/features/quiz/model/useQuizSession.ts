import { useEffect, useMemo, useState } from 'react';
import type { AuthResponse } from '../../../entities/auth/model/types';
import type {
  QuizAttemptResponse,
  QuizItem,
  QuizRecommendationV2Item,
  QuizRecommendationV2Response,
  QuizQuestion,
  QuizThemeCoverage,
  SubmittedAnswer,
} from '../../../entities/quiz/model/types';
import { analysisApi } from '../../analysis/api/analysisApi';
import { quizApi } from '../api/quizApi';

interface AnswerFeedback {
  isCorrect: boolean;
  explanation: string;
}

const RENAL_MAIN_DISEASE = 'CHRONIC_KIDNEY_DISEASE';
const RENAL_PRIMARY_SLUG = 'module-renal-quiz-principal';
const RECOMMENDATION_LIMIT = 10;

const toSignature = (values: string[]) => values.slice().sort().join('|');

const evaluate = (question: QuizQuestion, selected: string[]): AnswerFeedback => {
  const expected = question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.code);

  const isCorrect = toSignature(expected) === toSignature(selected);
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

const movePrimaryRenalQuizFirst = (quizzes: QuizItem[]) => {
  const primaryIndex = quizzes.findIndex((item) => item.slug === RENAL_PRIMARY_SLUG);
  if (primaryIndex <= 0) {
    return quizzes;
  }

  const primaryQuiz = quizzes[primaryIndex];
  return [primaryQuiz, ...quizzes.filter((item) => item.id !== primaryQuiz.id)];
};

const toRecommendationMap = (recommendation: QuizRecommendationV2Response | null) => {
  const map: Record<string, QuizRecommendationV2Item> = {};
  (recommendation?.recommendations ?? []).forEach((item) => {
    map[item.quizId] = item;
  });
  return map;
};

export const useQuizSession = (auth: AuthResponse | null) => {
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

  const shuffle = (values: string[]) => {
    const buffer = [...values];
    for (let i = buffer.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [buffer[i], buffer[j]] = [buffer[j], buffer[i]];
    }

    return buffer;
  };

  const getNextQuiz = (pool: QuizItem[], patientId: string): QuizItem => {
    if (pool.length === 1) {
      return pool[0];
    }

    const orderKey = `akacare_quiz_order_${patientId}`;
    const indexKey = `akacare_quiz_order_index_${patientId}`;
    const poolIds = pool.map((item) => item.id);

    let order: string[] = [];
    const rawOrder = window.sessionStorage.getItem(orderKey);
    if (rawOrder) {
      try {
        const parsed = JSON.parse(rawOrder) as string[];
        if (parsed.every((id) => poolIds.includes(id)) && parsed.length === poolIds.length) {
          order = parsed;
        }
      } catch {
        order = [];
      }
    }

    if (order.length === 0) {
      order = shuffle(poolIds);
      window.sessionStorage.setItem(orderKey, JSON.stringify(order));
      window.sessionStorage.setItem(indexKey, '0');
    }

    const rawIndex = window.sessionStorage.getItem(indexKey);
    const safeIndex = rawIndex ? Number(rawIndex) : 0;
    const currentIndex = Number.isFinite(safeIndex) ? safeIndex : 0;

    if (currentIndex >= order.length) {
      const renewed = shuffle(poolIds);
      window.sessionStorage.setItem(orderKey, JSON.stringify(renewed));
      window.sessionStorage.setItem(indexKey, '1');
      const renewedId = renewed[0];
      return pool.find((item) => item.id === renewedId) ?? pool[0];
    }

    const selectedId = order[currentIndex];
    window.sessionStorage.setItem(indexKey, String(currentIndex + 1));

    return pool.find((item) => item.id === selectedId) ?? pool[0];
  };

  const fetchEffectiveQuizzes = async () => {
    if (!auth) {
      return {
        quizzes: [] as QuizItem[],
        coverage: null as QuizThemeCoverage | null,
        recommendationMap: {} as Record<string, QuizRecommendationV2Item>,
      };
    }

    const [quizzesResult, coverageResult, recommendationResult] = await Promise.allSettled([
      quizApi.list({
        patientProfile: auth.patient.profile,
        patientId: auth.patient.id,
        mainDisease: RENAL_MAIN_DISEASE,
      }),
      quizApi.coverage(),
      analysisApi.recommendForPatientV2({
        patientId: auth.patient.id,
        token: auth.accessToken,
        dominantDisease: RENAL_MAIN_DISEASE,
        limit: RECOMMENDATION_LIMIT,
      }),
    ]);

    const coverage = coverageResult.status === 'fulfilled' ? coverageResult.value : null;

    if (quizzesResult.status !== 'fulfilled') {
      throw quizzesResult.reason;
    }

    const quizzes = quizzesResult.value;
    const recommendation =
      recommendationResult.status === 'fulfilled' ? recommendationResult.value : null;
    const rankedQuizzes = orderQuizzesByRecommendations(quizzes, recommendation);
    const effectiveQuizzes = movePrimaryRenalQuizFirst(rankedQuizzes);
    const recommendationMap = toRecommendationMap(recommendation);

    return { quizzes: effectiveQuizzes, coverage, recommendationMap };
  };

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
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const {
          quizzes: effectiveQuizzes,
          coverage,
          recommendationMap: nextRecommendationMap,
        } = await fetchEffectiveQuizzes();
        setThemeCoverage(coverage);
        setRecommendationMap(nextRecommendationMap);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chargement quiz impossible.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [auth]);

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
        } = await fetchEffectiveQuizzes();
        if (refreshedQuizzes.length > 0) {
          pool = refreshedQuizzes;
          setQuizPool(refreshedQuizzes);
          setThemeCoverage(coverage);
          setRecommendationMap(refreshedRecommendationMap);
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
        ? uniqueIds
        : hasStarted && auth
          ? [getNextQuiz(pool, auth.patient.id).id]
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
      const payloadAnswers: SubmittedAnswer[] = quiz.questions
        .map((question) => ({
          questionId: question.id,
          value: answers[question.id] ?? [],
        }))
        .filter((item) => item.value.length > 0);

      setIsLoading(true);
      setError(null);
      try {
        const submittedAttempt = await submitQuiz(payloadAnswers);
        if (!submittedAttempt) {
          return;
        }

        setAttempt(submittedAttempt);

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
  };

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
    isRunCompleted,
    totalQuestionsInRun,
    sessionQuizCursor,
    sessionQuizTotal: sessionQuizIds.length || 1,
    correctAnswersCount,
    start,
    selectQuiz,
    toggleOption,
    validateCurrentAnswer,
    goNext,
    backToModules,
  };
};
