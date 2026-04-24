import { useEffect, useMemo, useState } from 'react';
import type { QuizItem, QuizRecommendationV2Item } from '../entities/quiz/model/types';
import { getThemeLabel } from '../shared/lib/quiz/themeLabels';
import { PrimaryButton } from '../shared/ui/PrimaryButton';
import { MedicalNotice } from './MedicalNotice';

interface QuizStartPageProps {
  quiz: QuizItem;
  quizzes: QuizItem[];
  recommendationMap: Record<string, QuizRecommendationV2Item>;
  patientName: string;
  onStart: (quizIds: string[]) => void;
  onSelectQuiz: (quizId: string) => void;
  onLogout: () => void;
}

const MODULE_RUN_SIZE = 10;
const RECOMMENDATION_PREVIEW_SIZE = 5;

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Débutant',
  INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Avancé',
};

const LEVEL_RANK: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
};

const isPrincipalQuiz = (quiz: QuizItem) =>
  /principal/i.test(quiz.slug) || /quiz\s*principal/i.test(quiz.title);

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/\(quiz\s*\d+\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const getQuestionSignature = (quiz: QuizItem) =>
  quiz.questions.map((question) => {
    const text = normalizeText(question.text);
    const options = question.options
      .map((option) => normalizeText(option.label))
      .sort()
      .join('|');
    return `${text}::${options}`;
  });

const filterQuizzesWithoutQuestionOverlap = (orderedQuizzes: QuizItem[]) => {
  const usedQuestionSignatures = new Set<string>();
  const uniqueQuizzes: QuizItem[] = [];

  orderedQuizzes.forEach((item) => {
    const signatures = getQuestionSignature(item);
    const hasOverlap = signatures.some((signature) => usedQuestionSignatures.has(signature));
    if (hasOverlap) {
      return;
    }

    uniqueQuizzes.push(item);
    signatures.forEach((signature) => usedQuestionSignatures.add(signature));
  });

  return uniqueQuizzes;
};

export function QuizStartPage({
  quiz,
  quizzes,
  recommendationMap,
  patientName,
  onStart,
  onSelectQuiz,
  onLogout,
}: QuizStartPageProps) {
  const [activeTheme, setActiveTheme] = useState('ALL');

  const availableByTheme = useMemo(() => {
    const counts = new Map<string, number>();
    quizzes.forEach((item) => {
      (item.themes ?? []).forEach((theme) => counts.set(theme, (counts.get(theme) ?? 0) + 1));
    });

    return counts;
  }, [quizzes]);

  const themes = useMemo(() => {
    return Array.from(availableByTheme.keys());
  }, [availableByTheme]);

  const filteredQuizzes = useMemo(() => {
    if (activeTheme === 'ALL') {
      return quizzes;
    }

    return quizzes.filter((item) => (item.themes ?? []).includes(activeTheme));
  }, [activeTheme, quizzes]);

  useEffect(() => {
    if (!filteredQuizzes.length) {
      return;
    }

    const hasSelectedQuiz = filteredQuizzes.some((item) => item.id === quiz.id);
    if (!hasSelectedQuiz) {
      onSelectQuiz(filteredQuizzes[0].id);
    }
  }, [filteredQuizzes, onSelectQuiz, quiz.id]);

  useEffect(() => {
    const selectedQuizHasTheme =
      activeTheme === 'ALL' || (quiz.themes ?? []).includes(activeTheme);
    if (!selectedQuizHasTheme) {
      setActiveTheme('ALL');
    }
  }, [activeTheme, quiz.themes]);

  const orderedLearningPath = useMemo(() => {
    const uniqueRecommended = filterQuizzesWithoutQuestionOverlap(filteredQuizzes);
    const originalIndex = new Map(
      uniqueRecommended.map((item, index) => [item.id, index] as const),
    );

    return [...uniqueRecommended].sort((left, right) => {
      const leftIsPrincipal = isPrincipalQuiz(left);
      const rightIsPrincipal = isPrincipalQuiz(right);
      if (leftIsPrincipal !== rightIsPrincipal) {
        return leftIsPrincipal ? 1 : -1;
      }

      const leftRank = LEVEL_RANK[left.level] ?? Number.MAX_SAFE_INTEGER;
      const rightRank = LEVEL_RANK[right.level] ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      const leftIndex = originalIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = originalIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex;
    });
  }, [filteredQuizzes]);

  const moduleRunIds = useMemo(() => {
    if (!orderedLearningPath.length) {
      return [] as string[];
    }

    return orderedLearningPath.slice(0, MODULE_RUN_SIZE).map((item) => item.id);
  }, [orderedLearningPath]);

  const recommendedPreview = useMemo(() => {
    return orderedLearningPath.slice(0, RECOMMENDATION_PREVIEW_SIZE);
  }, [orderedLearningPath]);

  return (
    <main className="screen start-screen">
      <section className="start-topbar">
        <button type="button" className="back-link" onClick={onLogout}>
          ← Retour
        </button>
      </section>

      <section className="card start-card">
        <div className="start-shell">
          <section className="start-main-column">
            <div className="start-intro">
              <p className="screen-subtitle">Bonjour {patientName}</p>
              <h1 className="screen-title">Démarrer votre Quiz</h1>
              <p className="screen-subtitle">{quiz.title}</p>
              <div className="quiz-current-themes">
                {(quiz.themes ?? []).map((theme) => (
                  <span key={theme} className="theme-badge">
                    {getThemeLabel(theme)}
                  </span>
                ))}
              </div>
            </div>

            <div className="theme-select-wrap">
              <label htmlFor="theme-select" className="theme-select-label">
                Thème du quiz
              </label>
              <select
                id="theme-select"
                className="theme-select"
                value={activeTheme}
                onChange={(event) => setActiveTheme(event.target.value)}
              >
                <option value="ALL">Tous les thèmes</option>
                {themes.map((theme) => (
                  <option key={theme} value={theme}>
                    {getThemeLabel(theme)}
                  </option>
                ))}
              </select>
            </div>

            <MedicalNotice variant="start" />

            <div className="start-actions">
              <PrimaryButton className="start-action-button" onClick={() => onStart(moduleRunIds)}>
                C&apos;est parti !
              </PrimaryButton>
            </div>
          </section>

          <aside className="start-reco-column">
            <div className="recommendation-list" aria-label="Recommandations">
              <div className="recommendation-list__head">
                <p className="recommendation-list__title">Recommandations personnalisées</p>
                <p className="recommendation-list__count">
                  Ordre conseillé: Débutant → Intermédiaire → Avancé, puis quiz principal.
                </p>
              </div>
              {recommendedPreview.map((item) => {
                const itemRecommendation = recommendationMap[item.id];
                const itemLevelLabel = LEVEL_LABELS[item.level] ?? item.level;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`recommendation-card${item.id === quiz.id ? ' recommendation-card--active' : ''}`}
                    onClick={() => onSelectQuiz(item.id)}
                  >
                    <span className="recommendation-card__title">{item.title}</span>
                    <span className="recommendation-card__meta">
                      Niveau: {itemLevelLabel}
                      {itemRecommendation
                        ? ` • Pertinence: ${Math.round(itemRecommendation.relevanceScore * 100)}%`
                        : ''}
                    </span>
                    {itemRecommendation?.reasons?.[0] ? (
                      <span className="recommendation-card__reason">
                        {itemRecommendation.reasons[0]}
                      </span>
                    ) : (
                      <span className="recommendation-card__reason recommendation-card__reason--muted">
                        Recommandé pour renforcer votre parcours éducatif.
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
