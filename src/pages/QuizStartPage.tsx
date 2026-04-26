import { useEffect, useMemo, useState } from 'react';
import type {
  QuizAdaptiveLevelResponse,
  QuizItem,
  QuizRecommendationV2Item,
} from '../entities/quiz/model/types';
import { getThemeLabel } from '../shared/lib/quiz/themeLabels';
import { PrimaryButton } from '../shared/ui/PrimaryButton';
import { MedicalNotice } from './MedicalNotice';

interface QuizStartPageProps {
  quiz: QuizItem;
  quizzes: QuizItem[];
  recommendationMap: Record<string, QuizRecommendationV2Item>;
  adaptiveLevelDecision: QuizAdaptiveLevelResponse | null;
  patientName: string;
  onStart: (quizIds: string[]) => void;
  onSelectQuiz: (quizId: string) => void;
  onLogout: () => void;
}

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
    .replace(/dans le module [^,]+,\s*/gi, '')
    .replace(
      /\b(au domicile|en consultation|au moment du traitement|lors du suivi mensuel|en prevention quotidienne|en phase de stabilisation|en coordination avec l equipe soignante|lors du controle biologique|en contexte de comorbidite|dans le parcours educatif)\b/gi,
      'en contexte patient',
    )
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
  adaptiveLevelDecision,
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

  const recommendedPreview = useMemo(() => {
    return orderedLearningPath;
  }, [orderedLearningPath]);

  const currentLevel = adaptiveLevelDecision?.recommendedLevel ?? 'BEGINNER';
  const nextLevel = adaptiveLevelDecision?.nextLevel ?? null;
  const progressionPercentage = adaptiveLevelDecision?.progressionPercentage ?? 0;
  const remainingPerfectScores = adaptiveLevelDecision?.remainingPerfectScoresToUnlock ?? 3;
  const requiredPerfectScores = adaptiveLevelDecision?.requiredPerfectScoresForNextLevel ?? 3;
  const currentLevelRank = LEVEL_RANK[currentLevel] ?? 1;
  const levelOrder: Array<keyof typeof LEVEL_LABELS> = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
  const labelForLevel = (level: string) => LEVEL_LABELS[level] ?? level;

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

            <section className="level-journey" aria-label="Progression niveau">
              <p className="level-journey__title">Votre progression</p>
              <div className="level-journey__steps">
                {levelOrder.map((level) => {
                  const rank = LEVEL_RANK[level];
                  const isCurrent = level === currentLevel;
                  const isCompleted = rank < currentLevelRank;
                  return (
                    <span
                      key={level}
                      className={`level-step${isCurrent ? ' level-step--current' : ''}${isCompleted ? ' level-step--done' : ''}`}
                    >
                      {LEVEL_LABELS[level]}
                    </span>
                  );
                })}
              </div>
              <p className="level-journey__current">
                Niveau actuel: <strong>{labelForLevel(currentLevel)}</strong>
              </p>
              <p className="level-journey__metric">
                Progression vers le niveau suivant: <strong>{progressionPercentage}%</strong>
              </p>
              {nextLevel ? (
                <p className="level-journey__metric">
                  Scores parfaits validés: <strong>{Math.max(requiredPerfectScores - remainingPerfectScores, 0)}</strong>/{requiredPerfectScores}
                </p>
              ) : null}
              <p className="level-journey__objective">
                {nextLevel
                  ? `Encore ${remainingPerfectScores} quiz parfait(s) à 10/10 pour passer au niveau ${labelForLevel(nextLevel)}.`
                  : 'Objectif atteint: niveau Avancé validé.'}
              </p>
            </section>

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
              <PrimaryButton className="start-action-button" onClick={() => onStart([quiz.id])}>
                C&apos;est parti !
              </PrimaryButton>
            </div>
          </section>

          <aside className="start-reco-column">
            <div className="recommendation-list" aria-label="Recommandations">
              <div className="recommendation-list__head">
                <p className="recommendation-list__title">Recommandations personnalisées</p>
                <p className="recommendation-list__count">
                  Ordre des niveaux: Débutant puis Intermédiaire puis Avancé.
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
