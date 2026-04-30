import { useEffect, useMemo, useState } from 'react';
import type { PatientAuthResponse } from '../entities/auth/model/types';
import type { QuizHistoryItem } from '../entities/quiz/model/types';
import { useFhirExport } from '../features/fhir/model/useFhirExport';
import { useAuth } from '../features/auth/model/useAuth';
import { useQuizSession } from '../features/quiz/model/useQuizSession';
import { LoginPage } from '../pages/LoginPage';
import { MedicalNotice } from '../pages/MedicalNotice';
import { ProfessionalDashboardPage } from '../pages/ProfessionalDashboardPage';
import { QuizQuestionPage } from '../pages/QuizQuestionPage';
import { QuizStartPage } from '../pages/QuizStartPage';
import { PrimaryButton } from '../shared/ui/PrimaryButton';

type AppStep = 'start' | 'quiz';
const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Débutant',
  INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Avancé',
};

function App() {
  const { auth, isAuthenticated, isLoading: authLoading, error: authError, login, logout } = useAuth();
  const patientAuth: PatientAuthResponse | null = auth?.role === 'PATIENT' ? auth : null;
  const quizSession = useQuizSession(patientAuth);
  const fhirExport = useFhirExport({
    quizId: quizSession.quiz?.id,
    attemptId: quizSession.attempt?.id,
  });
  const [step, setStep] = useState<AppStep>('start');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistorySlot, setSelectedHistorySlot] = useState<0 | 1>(0);
  const [selectedHistoryQuestionIndex, setSelectedHistoryQuestionIndex] = useState(0);

  useEffect(() => {
    setStep('start');
    setIsHistoryOpen(false);
  }, [patientAuth?.patient.id]);

  const patientName = useMemo(() => {
    return `${patientAuth?.patient.firstName ?? ''} ${patientAuth?.patient.lastName ?? ''}`.trim();
  }, [patientAuth]);
  const openHistory = () => {
    setIsHistoryOpen(true);
    setSelectedHistorySlot(0);
    setSelectedHistoryQuestionIndex(0);
    void quizSession.loadSavedAttempts(30);
  };
  const closeHistory = () => {
    setIsHistoryOpen(false);
  };
  const levelLabel = (level: string) => LEVEL_LABELS[level] ?? level;
  const formatAttemptDate = (entry: QuizHistoryItem) => {
    const raw = entry.savedAt ?? entry.completedAt;
    if (!raw) {
      return '';
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };
  const computeHistoryScoreOnTen = (entry: QuizHistoryItem) => {
    if (Number.isFinite(entry.scoreOnTen) && entry.scoreOnTen >= 0) {
      return Number(entry.scoreOnTen.toFixed(2));
    }

    const total = entry.answers.length;
    if (total > 0) {
      const correct = entry.answers.filter((answer) => answer.isCorrect).length;
      return Number(((correct / total) * 10).toFixed(2));
    }

    return 0;
  };
  const recentSavedHistory = useMemo(
    () => quizSession.savedHistory.slice(0, 2),
    [quizSession.savedHistory],
  );
  const selectedHistoryEntry =
    recentSavedHistory[selectedHistorySlot] ?? recentSavedHistory[0] ?? null;

  useEffect(() => {
    if (!isHistoryOpen) {
      return;
    }

    setSelectedHistoryQuestionIndex(0);
  }, [selectedHistorySlot, isHistoryOpen]);

  useEffect(() => {
    if (!selectedHistoryEntry) {
      setSelectedHistoryQuestionIndex(0);
      return;
    }

    setSelectedHistoryQuestionIndex((previous) =>
      Math.min(previous, Math.max(selectedHistoryEntry.answers.length - 1, 0)),
    );
  }, [selectedHistoryEntry]);

  if (!isAuthenticated || !auth) {
    return <LoginPage isLoading={authLoading} error={authError} onLogin={login} />;
  }

  if (auth.role === 'HEALTH_PROFESSIONAL') {
    return <ProfessionalDashboardPage auth={auth} onLogout={logout} />;
  }

  if (quizSession.isLoading && !quizSession.quiz) {
    return (
      <main className="screen centered-screen">
        <p>Chargement du quiz...</p>
      </main>
    );
  }

  if (!quizSession.quiz) {
    return (
      <main className="screen centered-screen">
        <p>{quizSession.error ?? 'Aucun quiz disponible.'}</p>
        <PrimaryButton onClick={logout}>Se déconnecter</PrimaryButton>
      </main>
    );
  }

  if (quizSession.isRunCompleted && quizSession.attempt) {
    const attempt = quizSession.attempt;
    const levelUpNotice = quizSession.levelUpNotice;
    const perfectScoreNotice = quizSession.perfectScoreNotice;
    const fallbackTotalQuestions = Math.max(quizSession.totalQuestionsInRun, 1);
    const fallbackCorrectAnswers = Math.min(quizSession.correctAnswersCount, fallbackTotalQuestions);
    const apiScoreOnTen =
      Number.isFinite(attempt.scoreOnTen) && attempt.scoreOnTen >= 0 ? attempt.scoreOnTen : null;
    const backendCorrectAnswers = attempt.correctAnswersCount ?? null;
    const backendTotalQuestions = attempt.totalQuestionsCount ?? null;
    const weightedScoreOnTen =
      Number.isFinite(attempt.score) &&
      Number.isFinite(attempt.maxScore) &&
      attempt.maxScore > 0
        ? Number(((attempt.score / attempt.maxScore) * 10).toFixed(2))
        : null;
    const localScoreOnTen =
      fallbackTotalQuestions > 0
        ? Number(((fallbackCorrectAnswers / fallbackTotalQuestions) * 10).toFixed(2))
        : null;

    const finalScoreOnTen = (
      apiScoreOnTen === 0 && localScoreOnTen !== null && localScoreOnTen > 0
        ? localScoreOnTen
        : apiScoreOnTen
    ) ??
      (backendCorrectAnswers !== null &&
      backendTotalQuestions !== null &&
      backendTotalQuestions > 0
        ? Number(((backendCorrectAnswers / backendTotalQuestions) * 10).toFixed(2))
        : null) ??
      weightedScoreOnTen ??
      localScoreOnTen ??
      0;
    const fromLevel = levelUpNotice ? LEVEL_LABELS[levelUpNotice.fromLevel] ?? levelUpNotice.fromLevel : '';
    const toLevel = levelUpNotice ? LEVEL_LABELS[levelUpNotice.toLevel] ?? levelUpNotice.toLevel : '';
    const currentLevelLabel = LEVEL_LABELS[attempt.currentLevel] ?? attempt.currentLevel;
    const nextLevelLabel = attempt.nextLevel ? LEVEL_LABELS[attempt.nextLevel] ?? attempt.nextLevel : null;

    return (
      <main className="screen centered-screen">
        <section className="card summary-card">
          <button
            type="button"
            className="back-link summary-back"
            onClick={() => {
              quizSession.backToModules();
              setStep('start');
              setIsHistoryOpen(false);
            }}
          >
            ← Retour
          </button>
          <h1 className="screen-title">Quiz terminé</h1>
          <p className="screen-subtitle">Score: {finalScoreOnTen}/10</p>
          <p className="screen-subtitle">Niveau actuel: {currentLevelLabel}</p>
          {perfectScoreNotice ? (
            <div className="perfect-score-notice" role="status" aria-live="polite">
              {perfectScoreNotice}
            </div>
          ) : null}
          {levelUpNotice ? (
            <div className="level-up-notice" role="status" aria-live="polite">
              <p className="level-up-notice__title">Félicitations</p>
              <p className="level-up-notice__text">
                {attempt.congratulationMessage ??
                  `Vous passez du niveau ${fromLevel} au niveau ${toLevel}.`}
              </p>
            </div>
          ) : (
            <div className="level-progress-notice" role="status" aria-live="polite">
              <p className="level-progress-notice__title">Progression: {attempt.progressionPercentage}%</p>
              <p className="level-progress-notice__text">
                {nextLevelLabel
                  ? `Encore ${attempt.remainingPerfectScoresToUnlock} quiz parfait(s) à 10/10 pour débloquer le niveau ${nextLevelLabel}.`
                  : 'Objectif atteint: niveau Avancé validé.'}
              </p>
            </div>
          )}
          {fhirExport.isLoading ? <p className="fhir-loading">Chargement export FHIR...</p> : null}
          {fhirExport.error ? <p className="error-text">{fhirExport.error}</p> : null}
          <MedicalNotice variant="end" />
          <div className="summary-actions">
            <PrimaryButton
              type="button"
              onClick={() => {
                void quizSession.saveCurrentAttempt();
              }}
              disabled={quizSession.isSavingAttempt || quizSession.isCurrentAttemptSaved}
            >
              {quizSession.isCurrentAttemptSaved
                ? 'Quiz enregistré'
                : quizSession.isSavingAttempt
                  ? 'Enregistrement...'
                  : 'Enregistrer'}
            </PrimaryButton>
          </div>
          {quizSession.saveAttemptError ? (
            <p className="error-text">{quizSession.saveAttemptError}</p>
          ) : null}
          {quizSession.isCurrentAttemptSaved ? (
            <p className="save-success-text">Quiz enregistré avec succès.</p>
          ) : null}
          <PrimaryButton
            onClick={() => {
              quizSession.start();
              setStep('quiz');
              setIsHistoryOpen(false);
            }}
          >
            Rejouer
          </PrimaryButton>
        </section>
      </main>
    );
  }

  if (step === 'start') {
    return (
      <>
        <QuizStartPage
          quiz={quizSession.quiz}
          quizzes={quizSession.quizPool}
          adaptiveLevelDecision={quizSession.adaptiveLevelDecision}
          patientName={patientName}
          selectedLanguage={quizSession.selectedLanguage}
          onLanguageChange={quizSession.changeLanguage}
          onSelectQuiz={quizSession.selectQuiz}
          onOpenHistory={openHistory}
          isHistoryLoading={quizSession.isHistoryLoading}
          onLogout={logout}
          onStart={(quizIds) => {
            quizSession.start(quizIds);
            setStep('quiz');
            setIsHistoryOpen(false);
          }}
        />
        {isHistoryOpen ? (
          <div className="history-modal-overlay" role="presentation" onClick={closeHistory}>
            <section
              className="history-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Historique des quiz"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="history-modal__header">
                <h2>Mes derniers quiz</h2>
                <button type="button" className="history-modal__close" onClick={closeHistory}>
                  Fermer
                </button>
              </div>
              {!quizSession.isHistoryLoading && recentSavedHistory.length > 0 ? (
                <p className="history-modal__summary">
                  {recentSavedHistory.length} quiz enregistré(s) affiché(s)
                </p>
              ) : null}
              {quizSession.isHistoryLoading ? <p>Chargement...</p> : null}
              {quizSession.historyError ? <p className="error-text">{quizSession.historyError}</p> : null}
              {!quizSession.isHistoryLoading && recentSavedHistory.length === 0 ? (
                <p className="screen-subtitle">
                  Aucun quiz enregistré pour le moment.
                </p>
              ) : null}
              {!quizSession.isHistoryLoading && recentSavedHistory.length > 0 ? (
                <div className="history-choice-list" role="tablist" aria-label="Choix quiz">
                  <button
                    type="button"
                    className={`history-choice${selectedHistorySlot === 0 ? ' history-choice--active' : ''}`}
                    onClick={() => {
                      setSelectedHistorySlot(0);
                      setSelectedHistoryQuestionIndex(0);
                    }}
                  >
                    Dernier quiz
                  </button>
                  <button
                    type="button"
                    className={`history-choice${selectedHistorySlot === 1 ? ' history-choice--active' : ''}`}
                    onClick={() => {
                      setSelectedHistorySlot(1);
                      setSelectedHistoryQuestionIndex(0);
                    }}
                    disabled={!recentSavedHistory[1]}
                  >
                    Avant-dernier quiz
                  </button>
                </div>
              ) : null}
              <div className="history-modal__list">
                {selectedHistoryEntry ? (() => {
                  const entry = selectedHistoryEntry;
                  const total = entry.answers.length;
                  const correct = entry.answers.filter((answer) => answer.isCorrect).length;
                  const wrong = Math.max(total - correct, 0);
                  const hasQuestions = total > 0;
                  const questionIndex = hasQuestions
                    ? Math.min(selectedHistoryQuestionIndex, total - 1)
                    : 0;
                  const currentAnswer = hasQuestions ? entry.answers[questionIndex] : null;
                  const isLastQuestion = !hasQuestions || questionIndex >= total - 1;

                  return (
                    <article key={entry.attemptId} className="history-card history-card--single">
                      <div className="history-quiz-summary">
                        <div className="history-quiz-summary__top">
                          <p className="history-card__title">{entry.quizTitle}</p>
                          <p className="history-score-chip">
                            <span className="history-score-chip__label">Score</span>
                            {computeHistoryScoreOnTen(entry)}/10
                          </p>
                        </div>
                        <p className="history-card__meta">
                          Niveau: {levelLabel(entry.levelAtAttempt)} • {formatAttemptDate(entry)}
                        </p>
                        <p className="history-card__result">
                          Bonnes réponses: <strong>{correct}</strong> • Mauvaises réponses: <strong>{wrong}</strong>
                        </p>
                      </div>

                      {currentAnswer ? (
                        <>
                          <section
                            className={`history-answer history-answer--single${currentAnswer.isCorrect ? ' history-answer--correct' : ' history-answer--wrong'}`}
                          >
                            <div className="history-question-head">
                              <p className="history-question-counter">
                                Question {questionIndex + 1} / {total}
                              </p>
                              <p className="history-answer__question-status">
                                <span className="history-answer__badge">
                                  {currentAnswer.isCorrect ? '✅ Juste' : '❌ Fausse'}
                                </span>
                              </p>
                            </div>
                            <p className="history-answer__question-main">
                              {currentAnswer.questionText.replace(/\s*\(Quiz\s*\d+\)\s*$/i, '').trim()}
                            </p>
                            <div
                              className={`history-response-grid${currentAnswer.isCorrect ? ' history-response-grid--single' : ''}`}
                            >
                              {currentAnswer.isCorrect ? null : (
                                <div className="history-response-box history-response-box--patient">
                                  <p className="history-response-box__title">❌ Votre réponse</p>
                                  <p className="history-response-box__text">
                                    {currentAnswer.selectedLabels.join(' / ') || 'Aucune réponse'}
                                  </p>
                                </div>
                              )}
                              <div className="history-response-box history-response-box--expected">
                                <p className="history-response-box__title">✅ Bonne réponse</p>
                                <p className="history-response-box__text">
                                  {currentAnswer.correctLabels.join(' / ')}
                                </p>
                              </div>
                            </div>
                            <p className="history-tip">
                              💡 Astuce:{' '}
                              {currentAnswer.isCorrect
                                ? 'Très bien. Continuez à appliquer ce raisonnement.'
                                : 'Relisez cette notion clé et comparez votre choix à la bonne pratique.'}
                            </p>
                          </section>

                          <p className="history-pagination-context">
                            Question {questionIndex + 1} sur {total}
                          </p>
                          <div className="history-pagination" aria-label="Pagination des questions">
                            {entry.answers.map((_, index) => (
                              <button
                                key={`${entry.attemptId}-${index + 1}`}
                                type="button"
                                className={`history-pagination__dot${index === questionIndex ? ' history-pagination__dot--active' : ''}`}
                                onClick={() => setSelectedHistoryQuestionIndex(index)}
                                aria-label={`Aller à la question ${index + 1}`}
                              >
                                {index + 1}
                              </button>
                            ))}
                          </div>

                          <div className="history-nav">
                            <button
                              type="button"
                              className="secondary-pill-button history-nav__button"
                              onClick={() =>
                                setSelectedHistoryQuestionIndex((value) => Math.max(value - 1, 0))
                              }
                              disabled={questionIndex === 0}
                            >
                              ← Précédent
                            </button>
                            <button
                              type="button"
                              className="secondary-pill-button history-nav__button history-nav__button--primary"
                              onClick={() => {
                                if (isLastQuestion) {
                                  closeHistory();
                                  return;
                                }
                                setSelectedHistoryQuestionIndex((value) =>
                                  Math.min(value + 1, total - 1),
                                );
                              }}
                            >
                              {isLastQuestion ? 'Terminer' : 'Suivant →'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="history-empty-note">
                          Ce quiz est bien enregistré, mais ses questions/réponses ne sont pas encore disponibles.
                        </p>
                      )}
                    </article>
                  );
                })() : null}
              </div>
            </section>
          </div>
        ) : null}
      </>
    );
  }

  if (!quizSession.currentQuestion) {
    return (
      <main className="screen centered-screen">
        <p>Question introuvable.</p>
      </main>
    );
  }

  return (
    <QuizQuestionPage
      progressIndex={quizSession.currentIndex}
      progressTotal={quizSession.quiz.questions.length}
      isFinalStep={
        quizSession.currentIndex >= quizSession.quiz.questions.length - 1
      }
      question={quizSession.currentQuestion}
      language={quizSession.selectedLanguage}
      authToken={patientAuth?.accessToken}
      levelUpNotice={quizSession.levelUpNotice}
      perfectScoreNotice={quizSession.perfectScoreNotice}
      selectedValues={quizSession.draftSelection}
      feedback={quizSession.feedback}
      isLoading={quizSession.isLoading}
      onSelect={quizSession.toggleOption}
      onValidate={quizSession.validateCurrentAnswer}
      onNext={quizSession.goNext}
      onBack={() => setStep('start')}
    />
  );
}

export default App;
