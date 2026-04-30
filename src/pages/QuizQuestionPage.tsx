import { useEffect } from 'react';
import type { QuizQuestion } from '../entities/quiz/model/types';
import type { PatientLanguage } from '../shared/lib/i18n/language';
import { expandMedicalAbbreviations } from '../shared/lib/quiz/expandMedicalAbbreviations';
import { useTextToSpeech } from '../shared/lib/tts/useTextToSpeech';
import { PrimaryButton } from '../shared/ui/PrimaryButton';

interface QuizQuestionPageProps {
  progressIndex: number;
  progressTotal: number;
  isFinalStep: boolean;
  question: QuizQuestion;
  language: PatientLanguage;
  authToken?: string;
  levelUpNotice?: { fromLevel: string; toLevel: string } | null;
  perfectScoreNotice?: string | null;
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
  language,
  authToken,
  levelUpNotice,
  perfectScoreNotice,
  selectedValues,
  isLoading,
  feedback,
  onSelect,
  onValidate,
  onNext,
  onBack,
}: QuizQuestionPageProps) {
  const progress = Math.round(((progressIndex + 1) / progressTotal) * 100);
  const levelLabels: Record<string, string> = {
    BEGINNER: 'Débutant',
    INTERMEDIATE: 'Intermédiaire',
    ADVANCED: 'Avancé',
  };
  const fromLevel = levelUpNotice
    ? levelLabels[levelUpNotice.fromLevel] ?? levelUpNotice.fromLevel
    : '';
  const toLevel = levelUpNotice ? levelLabels[levelUpNotice.toLevel] ?? levelUpNotice.toLevel : '';
  const {
    isSupported: isSpeechSupported,
    isSpeaking,
    isLoading: isSpeechLoading,
    error: speechError,
    stop,
    toggleSpeak,
  } = useTextToSpeech(language, { authToken });
  const canonicalQuestionText = question.text
    .replace(/\(Quiz\s*\d+\)\s*$/i, '')
    .replace(/\s+\?/g, '?')
    .trim();
  const promptQuestionText = (question.promptText ?? '')
    .replace(/\(Quiz\s*\d+\)\s*$/i, '')
    .replace(/\s+\?/g, '?')
    .trim();
  const displayQuestionText = expandMedicalAbbreviations(promptQuestionText || canonicalQuestionText, {
    language,
  });
  const hasVisualOptions = question.options.some((option) => Boolean(option.imageUrl));
  const isImageOnlyQuestion = !promptQuestionText && hasVisualOptions;
  const speechText = expandMedicalAbbreviations(
    (question.ttsText ?? question.audioText ?? displayQuestionText).trim(),
    { language },
  );

  useEffect(() => {
    stop();
  }, [question.id, stop]);

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
        {perfectScoreNotice ? (
          <div className="perfect-score-notice" role="status" aria-live="polite">
            {perfectScoreNotice}
          </div>
        ) : null}

        {levelUpNotice ? (
          <div className="quiz-level-up-notice" role="status" aria-live="polite">
            Félicitations, vous passez du niveau {fromLevel} au niveau {toLevel}.
          </div>
        ) : null}

        <h1 className="question-title">{displayQuestionText}</h1>
        {isImageOnlyQuestion ? (
          <p className="question-instruction">Choisissez l&apos;image la plus adaptée.</p>
        ) : null}

        {question.imageUrl ? (
          <figure className="question-visual">
            <img
              src={question.imageUrl}
              alt={expandMedicalAbbreviations(question.imageAlt ?? 'Illustration de la question', {
                language,
              })}
              className="question-visual__image"
              loading="lazy"
            />
          </figure>
        ) : null}

        <div className="question-audio">
          <button
            type="button"
            className={`question-audio__button${isSpeaking ? ' question-audio__button--active' : ''}`}
            onClick={() => toggleSpeak(speechText)}
            aria-label="Écouter la question"
            title={isSpeaking ? 'Arrêter la lecture' : 'Écouter la question'}
            aria-pressed={isSpeaking}
            disabled={!isSpeechSupported || !speechText || isSpeechLoading}
          >
            <span aria-hidden="true" className="question-audio__icon-svg">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M3 10v4h4l5 5V5L7 10H3z" />
                <path d="M14.5 8.5a1 1 0 0 1 1.4 0 5 5 0 0 1 0 7 1 1 0 1 1-1.4-1.4 3 3 0 0 0 0-4.2 1 1 0 0 1 0-1.4z" />
                <path d="M17.8 5.2a1 1 0 0 1 1.4 0 9 9 0 0 1 0 12.8 1 1 0 0 1-1.4-1.4 7 7 0 0 0 0-10 1 1 0 0 1 0-1.4z" />
              </svg>
            </span>
            <span className="question-audio__label">
              {isSpeaking ? 'Arrêter la lecture' : 'Écouter la question'}
            </span>
          </button>
          {!isSpeechSupported ? (
            <p className="question-audio__status">Lecture vocale indisponible sur ce navigateur.</p>
          ) : speechError ? (
            <p className="question-audio__status" role="status" aria-live="polite">
              {speechError}
            </p>
          ) : isSpeechLoading ? (
            <p className="question-audio__status" role="status" aria-live="polite">
              Génération audio...
            </p>
          ) : isSpeaking ? (
            <p className="question-audio__status" role="status" aria-live="polite">
              Lecture en cours...
            </p>
          ) : null}
        </div>

        <div className={`answers-list${hasVisualOptions ? ' answers-list--image' : ''}`}>
          {question.options.map((option) => {
            const selected = selectedValues.includes(option.code);
            const optionLabel = expandMedicalAbbreviations(option.label, { language });
            const optionImageAlt = expandMedicalAbbreviations(option.imageAlt ?? option.label, {
              language,
            });
            return (
              <button
                key={option.code}
                type="button"
                className={`answer-card${selected ? ' answer-card--selected' : ''}${option.imageUrl ? ' answer-card--image' : ''}`}
                onClick={() => onSelect(option.code)}
                disabled={Boolean(feedback)}
                aria-label={optionLabel}
              >
                {option.imageUrl ? (
                  <span className="answer-card__image-wrap">
                    <img
                      src={option.imageUrl}
                      alt={optionImageAlt}
                      className="answer-card__image"
                      loading="lazy"
                    />
                  </span>
                ) : null}

                {option.imageUrl ? (
                  <span className="sr-only">{optionLabel}</span>
                ) : (
                  <span className="answer-card__label">{optionLabel}</span>
                )}
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
            <p className="feedback-text">
              {expandMedicalAbbreviations(feedback.explanation, { language })}
            </p>
            <PrimaryButton onClick={onNext} disabled={isLoading}>
              {isFinalStep ? 'Terminer' : 'Suivant'}
            </PrimaryButton>
          </section>
        )}
      </section>
    </main>
  );
}
