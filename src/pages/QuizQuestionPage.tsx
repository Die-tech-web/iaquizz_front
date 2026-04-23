import type { QuizQuestion } from '../entities/quiz/model/types';
import { PrimaryButton } from '../shared/ui/PrimaryButton';

interface QuizQuestionPageProps {
  progressIndex: number;
  progressTotal: number;
  isFinalStep: boolean;
  question: QuizQuestion;
  selectedValues: string[];
  isLoading: boolean;
  feedback: { isCorrect: boolean; explanation: string } | null;
  onSelect: (optionCode: string) => void;
  onValidate: () => void;
  onNext: () => Promise<void>;
  onBack: () => void;
}

export function QuizQuestionPage({
  progressIndex,
  progressTotal,
  isFinalStep,
  question,
  selectedValues,
  isLoading,
  feedback,
  onSelect,
  onValidate,
  onNext,
  onBack,
}: QuizQuestionPageProps) {
  const progress = Math.round(((progressIndex + 1) / progressTotal) * 100);

  return (
    <main className="screen quiz-screen">
      <section className="quiz-topbar">
        <button type="button" className="back-link" onClick={onBack}>
          Retour
        </button>
        <div className="progress-card">
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <strong>
            {progressIndex + 1} / {progressTotal}
          </strong>
        </div>
      </section>

      <section className="quiz-body">
        <h1 className="question-title">{question.text}</h1>

        <div className="answers-list">
          {question.options.map((option) => {
            const selected = selectedValues.includes(option.code);
            return (
              <button
                key={option.code}
                type="button"
                className={`answer-card${selected ? ' answer-card--selected' : ''}`}
                onClick={() => onSelect(option.code)}
                disabled={Boolean(feedback)}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {!feedback ? (
          <PrimaryButton onClick={onValidate} disabled={selectedValues.length === 0 || isLoading}>
            Valider
          </PrimaryButton>
        ) : (
          <section className={`feedback ${feedback.isCorrect ? 'feedback--ok' : 'feedback--ko'}`}>
            <div className="feedback-icon" aria-hidden="true">
              {feedback.isCorrect ? '✓' : '✕'}
            </div>
            <p className="feedback-title">
              {feedback.isCorrect ? 'Bonne réponse.' : 'Mauvaise réponse.'}
            </p>
            <p className="feedback-text">{feedback.explanation}</p>
            <PrimaryButton onClick={onNext} disabled={isLoading}>
              {isFinalStep ? 'Terminer' : 'Suivant'}
            </PrimaryButton>
          </section>
        )}
      </section>
    </main>
  );
}
