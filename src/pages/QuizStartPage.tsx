import { useEffect, useMemo, useState } from 'react';
import type { QuizItem } from '../entities/quiz/model/types';
import { getThemeLabel } from '../shared/lib/quiz/themeLabels';
import { PrimaryButton } from '../shared/ui/PrimaryButton';

interface QuizStartPageProps {
  quiz: QuizItem;
  quizzes: QuizItem[];
  patientName: string;
  onStart: (quizIds: string[]) => void;
  onSelectQuiz: (quizId: string) => void;
  onLogout: () => void;
}

const MODULE_RUN_SIZE = 10;

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/\(quiz\s*\d+\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const getQuizContentSignature = (quiz: QuizItem) => {
  const questionSignatures = quiz.questions.map((question) => {
    const text = normalizeText(question.text);
    const options = question.options
      .map((option) => normalizeText(option.label))
      .sort()
      .join('|');
    return `${text}::${options}`;
  });

  return questionSignatures.sort().join('||');
};

export function QuizStartPage({
  quiz,
  quizzes,
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

  const moduleRunIds = useMemo(() => {
    if (!filteredQuizzes.length) {
      return [] as string[];
    }

    const selectedFirst = [
      quiz,
      ...filteredQuizzes.filter((item) => item.id !== quiz.id),
    ];
    const seen = new Set<string>();
    const uniqueQuizzes: QuizItem[] = [];

    selectedFirst.forEach((item) => {
      const signature = getQuizContentSignature(item);
      if (seen.has(signature)) {
        return;
      }
      seen.add(signature);
      uniqueQuizzes.push(item);
    });

    return uniqueQuizzes.slice(0, MODULE_RUN_SIZE).map((item) => item.id);
  }, [filteredQuizzes, quiz]);

  return (
    <main className="screen start-screen">
      <section className="start-topbar">
        <button type="button" className="back-link" onClick={onLogout}>
          Retour
        </button>
      </section>

      <section className="card start-card">
        <div className="quiz-hero" aria-hidden="true">
          <div className="quiz-hero__shape" />
          <div className="quiz-hero__avatar">👩🏾‍⚕️</div>
        </div>

        <div className="start-content">
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

          <div className="quiz-picker" aria-label="Quiz sélectionné">
            <p className="quiz-selected-title">{quiz.title}</p>
            <p className="quiz-selected-meta">
              Module: {Math.max(filteredQuizzes.length, 1)} quiz • Session:{" "}
              {Math.min(moduleRunIds.length, MODULE_RUN_SIZE)} quiz uniques
            </p>
          </div>

          <PrimaryButton onClick={() => onStart(moduleRunIds)}>
            C&apos;est parti !
          </PrimaryButton>
        </div>
      </section>
    </main>
  );
}
