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
    const totalQuestions = Math.max(quizSession.totalQuestionsInRun, 1);
    const noteSur20 = Math.round((quizSession.correctAnswersCount / totalQuestions) * 20 * 10) / 10;

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
            Score final: {quizSession.correctAnswersCount}/{totalQuestions}
          </p>
          <p className="screen-subtitle">Note finale: {noteSur20}/20</p>
          <p className="screen-subtitle">
            Export FHIR: {fhirExport.error ? 'Indisponible' : 'Questionnaire et QuestionnaireResponse générés'}
          </p>
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
