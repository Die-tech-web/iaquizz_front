import { useEffect, useMemo, useState } from "react";
import type {
  QuizAdaptiveLevelResponse,
  QuizItem,
} from "../entities/quiz/model/types";
import {
  getLanguageLabel,
  PATIENT_LANGUAGES,
  type PatientLanguage,
} from "../shared/lib/i18n/language";
import { expandMedicalAbbreviations } from "../shared/lib/quiz/expandMedicalAbbreviations";
import { getThemeLabel } from "../shared/lib/quiz/themeLabels";
import { PrimaryButton } from "../shared/ui/PrimaryButton";
import { MedicalNotice } from "./MedicalNotice";

interface QuizStartPageProps {
  quiz: QuizItem;
  quizzes: QuizItem[];
  adaptiveLevelDecision: QuizAdaptiveLevelResponse | null;
  patientName: string;
  selectedLanguage: PatientLanguage;
  onStart: (quizIds: string[]) => void;
  onLanguageChange: (language: PatientLanguage) => void;
  onSelectQuiz: (quizId: string) => void;
  onOpenHistory: () => void;
  isHistoryLoading: boolean;
  onLogout: () => void;
}

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
};

export function QuizStartPage({
  quiz,
  quizzes,
  adaptiveLevelDecision,
  patientName,
  selectedLanguage,
  onStart,
  onLanguageChange,
  onSelectQuiz,
  onOpenHistory,
  isHistoryLoading,
  onLogout,
}: QuizStartPageProps) {
  const [activeTheme, setActiveTheme] = useState("ALL");

  useEffect(() => {
    document.body.classList.add("quiz-start-bg");
    return () => {
      document.body.classList.remove("quiz-start-bg");
    };
  }, []);

  const availableByTheme = useMemo(() => {
    const counts = new Map<string, number>();
    quizzes.forEach((item) => {
      (item.themes ?? []).forEach((theme) =>
        counts.set(theme, (counts.get(theme) ?? 0) + 1),
      );
    });

    return counts;
  }, [quizzes]);

  const themes = useMemo(() => {
    return Array.from(availableByTheme.keys());
  }, [availableByTheme]);

  const filteredQuizzes = useMemo(() => {
    if (activeTheme === "ALL") {
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
      activeTheme === "ALL" || (quiz.themes ?? []).includes(activeTheme);
    if (!selectedQuizHasTheme) {
      setActiveTheme("ALL");
    }
  }, [activeTheme, quiz.themes]);

  const currentLevel =
    adaptiveLevelDecision?.currentLevel ??
    adaptiveLevelDecision?.recommendedLevel ??
    "BEGINNER";
  const labelForLevel = (level: string) => LEVEL_LABELS[level] ?? level;
  const patientLevelTone =
    currentLevel === "ADVANCED"
      ? "advanced"
      : currentLevel === "INTERMEDIATE"
        ? "intermediate"
        : "beginner";

  return (
    <main className="screen start-screen">
      <section className="card start-card">
        <div
          className={`patient-level-badge patient-level-badge--${patientLevelTone}`}
          aria-label={`Niveau actuel: ${labelForLevel(currentLevel)}`}
        >
          <span className="patient-level-badge__icon" aria-hidden="true" />
          <span className="patient-level-badge__text">
            <small>Niveau actuel</small>
            <strong>{labelForLevel(currentLevel)}</strong>
          </span>
        </div>
        <div className="start-shell">
          <section className="start-main-column">
            <div className="start-intro">
              <p className="screen-subtitle">Bonjour {patientName}</p>
              <h1 className="screen-title">Démarrer votre Quiz</h1>
              <p className="screen-subtitle">
                {expandMedicalAbbreviations(quiz.title, {
                  language: selectedLanguage,
                })}
              </p>
              <div className="quiz-current-themes">
                {(quiz.themes ?? []).map((theme) => (
                  <span key={theme} className="theme-badge">
                    {getThemeLabel(theme)}
                  </span>
                ))}
              </div>
            </div>

            <section
              className="quiz-personalization"
              aria-label="Personnalisez votre quiz"
            >
              <p className="quiz-personalization__heading">
                <span
                  className="quiz-personalization__sparkle"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" fill="none" role="presentation">
                    <path
                      d="M8 3.5L9.9 8.1L14.5 10L9.9 11.9L8 16.5L6.1 11.9L1.5 10L6.1 8.1L8 3.5Z"
                      fill="currentColor"
                    />
                    <path
                      d="M17.5 8L18.5 10.5L21 11.5L18.5 12.5L17.5 15L16.5 12.5L14 11.5L16.5 10.5L17.5 8Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                Personnalisez votre quiz
              </p>

              <div className="quiz-personalization-grid">
                <article className="personalization-card">
                  <span
                    className="personalization-card__icon-circle personalization-card__icon-circle--language"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24" fill="none" role="presentation">
                      <circle
                        cx="12"
                        cy="12"
                        r="8"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M4 12H20"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M12 4C14 6 15 9 15 12C15 15 14 18 12 20"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M12 4C10 6 9 9 9 12C9 15 10 18 12 20"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <div className="personalization-card__body">
                    <label
                      htmlFor="language-select"
                      className="personalization-card__title"
                    >
                      Langue du quiz
                    </label>
                    <div className="personalization-select-wrap">
                      <select
                        id="language-select"
                        className="personalization-select"
                        value={selectedLanguage}
                        onChange={(event) =>
                          onLanguageChange(
                            event.target.value as PatientLanguage,
                          )
                        }
                      >
                        {PATIENT_LANGUAGES.map((language) => (
                          <option key={language} value={language}>
                            {getLanguageLabel(language)}
                          </option>
                        ))}
                      </select>
                      <span
                        className="personalization-select__chevron"
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          role="presentation"
                        >
                          <path
                            d="M4 6L8 10L12 6"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    </div>
                    <p className="personalization-card__hint">
                      Choisissez votre langue
                    </p>
                  </div>
                </article>

                <article className="personalization-card">
                  <span
                    className="personalization-card__icon-circle personalization-card__icon-circle--theme"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24" fill="none" role="presentation">
                      <path
                        d="M5.5 5.5H18.5V18.5H5.5V5.5Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9 5.5V18.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M10.5 9.5H18.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </span>
                  <div className="personalization-card__body">
                    <label
                      htmlFor="theme-select"
                      className="personalization-card__title"
                    >
                      Thème du quiz
                    </label>
                    <div className="personalization-select-wrap">
                      <select
                        id="theme-select"
                        className="personalization-select"
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
                      <span
                        className="personalization-select__chevron"
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          role="presentation"
                        >
                          <path
                            d="M4 6L8 10L12 6"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    </div>
                    <p className="personalization-card__hint">
                      Large éventail de sujets
                    </p>
                  </div>
                </article>

                <article className="personalization-card">
                  <span
                    className="personalization-card__icon-circle personalization-card__icon-circle--difficulty"
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24" fill="none" role="presentation">
                      <rect
                        x="5"
                        y="13"
                        width="3"
                        height="6"
                        rx="1"
                        fill="currentColor"
                      />
                      <rect
                        x="10.5"
                        y="10"
                        width="3"
                        height="9"
                        rx="1"
                        fill="currentColor"
                      />
                      <rect
                        x="16"
                        y="6"
                        width="3"
                        height="13"
                        rx="1"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <div className="personalization-card__body">
                    <p className="personalization-card__title">Difficulté</p>
                    <p className="personalization-card__value-row">
                      <span className="personalization-card__value">
                        {labelForLevel(currentLevel)}
                      </span>
                      <span
                        className="personalization-card__value-chevron"
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          role="presentation"
                        >
                          <path
                            d="M4 6L8 10L12 6"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    </p>
                    <p className="personalization-card__hint">
                      Adapté à votre niveau
                    </p>
                  </div>
                </article>
              </div>
            </section>

            <MedicalNotice variant="start" />

            <div className="start-actions">
              <button
                type="button"
                className="back-link start-back-action"
                onClick={onLogout}
              >
                ← Retour
              </button>
              <button
                type="button"
                className="secondary-pill-button start-secondary-action"
                onClick={onOpenHistory}
                disabled={isHistoryLoading}
              >
                {isHistoryLoading ? "Chargement..." : "Derniers quiz"}
              </button>
              <PrimaryButton
                className="start-action-button"
                onClick={() => onStart([quiz.id])}
              >
                C&apos;est parti !
              </PrimaryButton>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
