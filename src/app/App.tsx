import { useEffect, useMemo, useState } from 'react';
import { useFhirExport } from '../features/fhir/model/useFhirExport';
import { useAuth } from '../features/auth/model/useAuth';
import { useQuizSession } from '../features/quiz/model/useQuizSession';
import { LoginPage } from '../pages/LoginPage';
import { MedicalNotice } from '../pages/MedicalNotice';
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
  const quizSession = useQuizSession(auth);
  const fhirExport = useFhirExport({
    quizId: quizSession.quiz?.id,
    attemptId: quizSession.attempt?.id,
  });
  const [step, setStep] = useState<AppStep>('start');

  useEffect(() => {
    setStep('start');
  }, [auth?.patient.id]);

  const patientName = useMemo(() => {
    if (!auth) {
      return '';
    }

    return `${auth.patient.firstName} ${auth.patient.lastName}`.trim();
  }, [auth]);

  if (!isAuthenticated) {
    return <LoginPage isLoading={authLoading} error={authError} onLogin={login} />;
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
    const totalQuestions = Math.max(quizSession.totalQuestionsInRun, 1);
    const quizCount = quizSession.sessionQuizTotal;
    const levelUpNotice = quizSession.levelUpNotice;
    const perfectScoreNotice = quizSession.perfectScoreNotice;
    const feedbackMessage =
      attempt.scoreOnTen >= 9
        ? 'Très bon résultat. Continuez avec ce rythme.'
        : attempt.scoreOnTen >= 7
          ? 'Bon résultat. Continuez à renforcer les points clés.'
          : 'Résultat perfectible. Reprenez calmement les notions essentielles.';
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
            }}
          >
            ← Retour
          </button>
          <h1 className="screen-title">Quiz terminé</h1>
          <p className="screen-subtitle">
            Parcours effectué: {quizCount} quiz, {totalQuestions} questions
          </p>
          <p className="screen-subtitle">Score: {attempt.scoreOnTen}/10</p>
          <p className="screen-subtitle">Niveau actuel: {currentLevelLabel}</p>
          <p className="screen-subtitle">{feedbackMessage}</p>
          <p className="screen-subtitle">
            Export FHIR: {fhirExport.error ? 'Indisponible' : 'Questionnaire et QuestionnaireResponse générés'}
          </p>
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
          <PrimaryButton
            onClick={() => {
              quizSession.start();
              setStep('quiz');
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
      <QuizStartPage
        quiz={quizSession.quiz}
        quizzes={quizSession.quizPool}
        recommendationMap={quizSession.recommendationMap}
        adaptiveLevelDecision={quizSession.adaptiveLevelDecision}
        patientName={patientName}
        onSelectQuiz={quizSession.selectQuiz}
        onLogout={logout}
        onStart={(quizIds) => {
          quizSession.start(quizIds);
          setStep('quiz');
        }}
      />
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
