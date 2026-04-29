import type { ProfessionalAuthResponse } from '../entities/auth/model/types';
import type { ProfessionalNotificationItem } from '../entities/notification/model/types';
import { useProfessionalNotifications } from '../features/notification/model/useProfessionalNotifications';
import { useProfessionalDashboard } from '../features/professional/model/useProfessionalDashboard';
import { PrimaryButton } from '../shared/ui/PrimaryButton';
import { useState } from 'react';

interface ProfessionalDashboardPageProps {
  auth: ProfessionalAuthResponse;
  onLogout: () => void;
}

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Débutant',
  INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Avancé',
};

const profileLabel = (profile: string) =>
  profile === 'CHRONIC'
    ? 'Chronique'
    : profile === 'AT_RISK'
      ? 'À risque'
      : profile === 'POST_ACUTE'
        ? 'Post-aigu'
        : 'Standard';

const levelLabel = (level: string) => LEVEL_LABELS[level] ?? level;

const levelToProgressEstimate = (level: string) => {
  if (level === 'ADVANCED') {
    return 100;
  }
  if (level === 'INTERMEDIATE') {
    return 66;
  }
  return 33;
};

const getPriorityMeta = (progression: number, level: string) => {
  if (level === 'BEGINNER' || progression < 45) {
    return { label: 'À surveiller', tone: 'watch' as const };
  }
  if (progression < 75) {
    return { label: 'Suivi actif', tone: 'follow' as const };
  }
  return { label: 'Stable', tone: 'stable' as const };
};

export function ProfessionalDashboardPage({ auth, onLogout }: ProfessionalDashboardPageProps) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeNotification, setActiveNotification] = useState<ProfessionalNotificationItem | null>(null);
  const [isSavedQuizzesOpen, setIsSavedQuizzesOpen] = useState(false);
  const [selectedSavedQuizSlot, setSelectedSavedQuizSlot] = useState<0 | 1>(0);
  const [selectedSavedQuizQuestionIndex, setSelectedSavedQuizQuestionIndex] = useState(0);
  const {
    patients,
    selectedPatient,
    selectedPatientId,
    selectedPatientInsight,
    selectedPatientSavedQuizzes,
    patientInsightLoading,
    savedQuizzesLoading,
    isLoading,
    error,
    savedQuizzesError,
    setSelectedPatientId,
    refresh,
    loadPatientSavedQuizzes,
  } = useProfessionalDashboard(auth.accessToken);
  const notifications = useProfessionalNotifications(auth.accessToken);

  const doctorName = auth.professional.firstName?.trim() || auth.professional.lastName?.trim() || 'Santé';
  const averageProgression =
    patients.length > 0
      ? Math.round(
          patients.reduce((acc, patient) => {
            return acc + levelToProgressEstimate(patient.currentLevel);
          }, 0) / patients.length,
        )
      : 0;
  const averageProgressionTone =
    averageProgression < 45 ? 'watch' : averageProgression < 75 ? 'follow' : 'stable';
  const monitoredPatientsCount = patients.filter((patient) => {
    const progression = levelToProgressEstimate(patient.currentLevel);
    return getPriorityMeta(progression, patient.currentLevel).tone === 'watch';
  }).length;
  const recentSavedQuizzes = selectedPatientSavedQuizzes.slice(0, 2);
  const selectedSavedQuiz =
    recentSavedQuizzes[selectedSavedQuizSlot] ?? recentSavedQuizzes[0] ?? null;
  const formatSavedQuizDate = (value?: string | null) => {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  };
  const scoreOnTenForSavedQuiz = (score: number) => Number((score ?? 0).toFixed(2));
  const notificationBadgeLabel =
    notifications.unreadCount > 2 ? '2+' : String(notifications.unreadCount);
  const selectedPatientProgression = selectedPatientInsight?.progressionPercentage
    ?? (selectedPatient ? levelToProgressEstimate(selectedPatient.currentLevel) : 0);
  const selectedPatientPriority = selectedPatient
    ? getPriorityMeta(selectedPatientProgression, selectedPatient.currentLevel)
    : null;

  return (
    <main className="screen professional-screen">
      <section className="card professional-shell">
        <header className="professional-header">
          <div>
            <p className="professional-header__eyebrow">Espace Professionnel</p>
            <h1 className="screen-title">
              Bonjour Dr. <span className="brand-solid">{doctorName}</span>
            </h1>
            <p className="screen-subtitle">
              Vue rapide des patients, des niveaux quiz et des priorités de suivi.
            </p>
          </div>
          <div className="professional-header__actions">
            <button
              type="button"
              className="notif-button"
              onClick={() => {
                setIsNotificationOpen((value) => {
                  const next = !value;
                  if (next) {
                    void notifications.markAllAsRead();
                  }
                  return next;
                });
              }}
              aria-label="Ouvrir les notifications"
              title="Notifications"
            >
              <span aria-hidden="true">🔔</span>
              {notifications.unreadCount > 0 ? (
                <span className="notif-button__badge">{notificationBadgeLabel}</span>
              ) : null}
            </button>
            <button
              type="button"
              className="ghost-button ghost-button--icon"
              onClick={() => void refresh()}
              aria-label="Actualiser le dashboard"
              title="Actualiser"
            >
              <span aria-hidden="true">↻</span>
            </button>
            <PrimaryButton onClick={onLogout}>Se déconnecter</PrimaryButton>
          </div>
        </header>

        {isNotificationOpen ? (
          <section className="professional-notifications" aria-label="Centre de notifications">
            <div className="professional-notifications__list">
              <div className="professional-panel__head">
                <h2>Notifications</h2>
                {notifications.isLoading ? <span>Chargement...</span> : null}
              </div>
              {notifications.error ? <p className="error-text">{notifications.error}</p> : null}
              {!notifications.items.length ? (
                <p className="professional-empty">Aucune notification pour le moment.</p>
              ) : (
                <div className="notification-list">
                  {notifications.items.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className={`notification-card${notification.status === 'UNREAD' ? ' notification-card--unread' : ''}${activeNotification?.id === notification.id ? ' notification-card--active' : ''}`}
                      onClick={() => {
                        setActiveNotification(notification);
                        void notifications.markAsRead(notification.id);
                      }}
                    >
                      <div className="notification-card__header">
                        <p>{notification.title}</p>
                        <span>{notification.scoreOnTen}/10</span>
                      </div>
                      <p className="notification-card__meta">
                        {notification.patient.firstName} {notification.patient.lastName}
                      </p>
                      <p className="notification-card__meta">
                        {new Date(notification.createdAt).toLocaleString('fr-FR')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="professional-notifications__detail">
              <h2>Détail alerte</h2>
              {!activeNotification ? (
                <p className="professional-empty">
                  Clique sur une notification pour afficher les informations patient.
                </p>
              ) : (
                <div className="notification-detail">
                  <p className="notification-detail__title">{activeNotification.title}</p>
                  <p className="notification-detail__text">{activeNotification.message}</p>
                  <div className="notification-detail__metrics">
                    <div>
                      <span>Patient</span>
                      <strong>
                        {activeNotification.patient.firstName} {activeNotification.patient.lastName}
                      </strong>
                    </div>
                    <div>
                      <span>Score critique</span>
                      <strong>{activeNotification.scoreOnTen}/10</strong>
                    </div>
                    <div>
                      <span>Niveau patient</span>
                      <strong>{levelLabel(activeNotification.patient.currentLevel)}</strong>
                    </div>
                    <div>
                      <span>Langue</span>
                      <strong>{activeNotification.patient.preferredLanguage.toUpperCase()}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}

        <section className="professional-stats" aria-label="Indicateurs">
          <article className="professional-stat professional-stat--summary">
            <div className="professional-stat__item professional-stat__item--kpi">
              <p className="professional-stat__label">Patients suivis</p>
              <strong>{patients.length}</strong>
              <span className="professional-stat__hint">
                {monitoredPatientsCount} à surveiller
              </span>
            </div>
            <div
              className={`professional-stat__item professional-stat__item--kpi professional-stat__item--${averageProgressionTone}`}
            >
              <p className="professional-stat__label">Progression moyenne</p>
              <strong>{averageProgression}%</strong>
              <span className="professional-stat__hint">suivi thérapeutique global</span>
            </div>
            <div className="professional-stat__item professional-stat__item--support">
              <p className="professional-stat__label">Spécialité</p>
              <strong>{auth.professional.specialty ?? 'Médecine générale'}</strong>
            </div>
          </article>
        </section>

        <section className="professional-content">
          <article className="professional-panel professional-patient-list">
            <div className="professional-panel__head">
              <h2>Patients</h2>
              {isLoading ? <span>Chargement...</span> : null}
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            {!isLoading && !patients.length ? (
              <p className="professional-empty">Aucun patient disponible pour le moment.</p>
            ) : null}

            <div className="patient-cards">
              {patients.map((patient) => {
                const isActive = patient.id === selectedPatientId;
                const progression = levelToProgressEstimate(patient.currentLevel);
                const priority = getPriorityMeta(progression, patient.currentLevel);
                return (
                  <button
                    key={patient.id}
                    type="button"
                    className={`patient-card${isActive ? ' patient-card--active' : ''}`}
                    onClick={() => setSelectedPatientId(patient.id)}
                  >
                    <div className="patient-card__top">
                      <p className="patient-card__name">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <span className={`patient-priority-badge patient-priority-badge--${priority.tone}`}>
                        {priority.label}
                      </span>
                    </div>
                    <p className="patient-card__meta">{profileLabel(patient.profile)}</p>
                    <div className="patient-card__metrics">
                      <div>
                        <span>Niveau</span>
                        <strong>{levelLabel(patient.currentLevel)}</strong>
                      </div>
                      <div>
                        <span>Progression</span>
                        <strong>{progression}%</strong>
                      </div>
                    </div>
                    <div className="patient-card__chips">
                      <span>{levelLabel(patient.currentLevel)}</span>
                      <span>{patient.preferredLanguage}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="professional-patient-list__actions">
              <button
                type="button"
                className="secondary-pill-button professional-action-button"
                onClick={() => {
                  if (!selectedPatientId) {
                    return;
                  }
                  setIsSavedQuizzesOpen(true);
                  setSelectedSavedQuizSlot(0);
                  setSelectedSavedQuizQuestionIndex(0);
                  void loadPatientSavedQuizzes(selectedPatientId, true);
                }}
                disabled={!selectedPatientId || savedQuizzesLoading}
              >
                {savedQuizzesLoading ? 'Chargement...' : 'Voir quiz enregistrés'}
              </button>
            </div>
          </article>

          <article className="professional-panel professional-patient-detail">
            <h2>Évaluation Quiz</h2>
            {!selectedPatient ? (
              <p className="professional-empty">
                Sélectionne un patient pour voir ses indicateurs de progression.
              </p>
            ) : (
              <div className="patient-detail">
                <div className="patient-detail__header">
                  <div>
                    <p className="patient-detail__title">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </p>
                    <p className="patient-detail__meta">
                      {selectedPatient.email ?? 'Email non renseigné'} · Profil{' '}
                      {profileLabel(selectedPatient.profile)}
                    </p>
                    <p className="patient-detail__meta">
                      Conditions: {selectedPatient.conditions.length || 0}
                    </p>
                  </div>
                  {selectedPatientPriority ? (
                    <span
                      className={`patient-priority-badge patient-priority-badge--${selectedPatientPriority.tone}`}
                    >
                      {selectedPatientPriority.label}
                    </span>
                  ) : null}
                </div>

                {patientInsightLoading ? (
                  <p className="professional-empty">Analyse en cours...</p>
                ) : selectedPatientInsight ? (
                  <>
                    <div className="patient-metrics">
                      <div className="patient-metrics__item patient-metrics__item--focus">
                        <span>Niveau actuel</span>
                        <strong>{levelLabel(selectedPatientInsight.currentLevel)}</strong>
                      </div>
                      <div className="patient-metrics__item">
                        <span>Niveau recommandé</span>
                        <strong>{levelLabel(selectedPatientInsight.recommendedLevel)}</strong>
                      </div>
                      <div className="patient-metrics__item patient-metrics__item--focus">
                        <span>Progression</span>
                        <strong>{selectedPatientInsight.progressionPercentage}%</strong>
                      </div>
                      <div className="patient-metrics__item">
                        <span>Tentatives</span>
                        <strong>{selectedPatientInsight.completedAttempts}</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="professional-empty">
                    Aucune donnée d&apos;évaluation disponible pour ce patient.
                  </p>
                )}
              </div>
            )}
          </article>
        </section>
      </section>

      {isSavedQuizzesOpen ? (
        <div className="history-modal-overlay" role="presentation" onClick={() => setIsSavedQuizzesOpen(false)}>
          <section
            className="history-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Quiz enregistrés du patient"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="history-modal__header">
              <h2>
                Quiz enregistrés
                {selectedPatient ? ` - ${selectedPatient.firstName} ${selectedPatient.lastName}` : ''}
              </h2>
              <button type="button" className="history-modal__close" onClick={() => setIsSavedQuizzesOpen(false)}>
                Fermer
              </button>
            </div>
            {!savedQuizzesLoading && recentSavedQuizzes.length > 0 ? (
              <p className="history-modal__summary">
                {recentSavedQuizzes.length} quiz enregistré(s) affiché(s)
              </p>
            ) : null}
            {savedQuizzesLoading ? <p>Chargement...</p> : null}
            {savedQuizzesError ? <p className="error-text">{savedQuizzesError}</p> : null}
            {!savedQuizzesLoading && recentSavedQuizzes.length === 0 ? (
              <p className="screen-subtitle">Aucun quiz enregistré disponible pour ce patient.</p>
            ) : null}
            {!savedQuizzesLoading && recentSavedQuizzes.length > 0 ? (
              <div className="history-choice-list" role="tablist" aria-label="Choix quiz enregistré">
                <button
                  type="button"
                  className={`history-choice${selectedSavedQuizSlot === 0 ? ' history-choice--active' : ''}`}
                  onClick={() => {
                    setSelectedSavedQuizSlot(0);
                    setSelectedSavedQuizQuestionIndex(0);
                  }}
                >
                  Dernier quiz
                </button>
                <button
                  type="button"
                  className={`history-choice${selectedSavedQuizSlot === 1 ? ' history-choice--active' : ''}`}
                  onClick={() => {
                    setSelectedSavedQuizSlot(1);
                    setSelectedSavedQuizQuestionIndex(0);
                  }}
                  disabled={!recentSavedQuizzes[1]}
                >
                  Avant-dernier quiz
                </button>
              </div>
            ) : null}
            <div className="history-modal__list">
              {selectedSavedQuiz ? (() => {
                const entry = selectedSavedQuiz;
                const total = entry.answers.length;
                const correct = entry.answers.filter((answer) => answer.isCorrect).length;
                const wrong = Math.max(total - correct, 0);
                const hasQuestions = total > 0;
                const questionIndex = hasQuestions
                  ? Math.min(selectedSavedQuizQuestionIndex, total - 1)
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
                          {scoreOnTenForSavedQuiz(entry.scoreOnTen)}/10
                        </p>
                      </div>
                      <p className="history-card__meta">
                        Niveau: {levelLabel(entry.levelAtAttempt)} • {formatSavedQuizDate(entry.savedAt ?? entry.completedAt)}
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
                              onClick={() => setSelectedSavedQuizQuestionIndex(index)}
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
                              setSelectedSavedQuizQuestionIndex((value) => Math.max(value - 1, 0))
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
                                setIsSavedQuizzesOpen(false);
                                return;
                              }
                              setSelectedSavedQuizQuestionIndex((value) =>
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
                        Ce quiz est enregistré, mais ses questions/réponses ne sont pas encore disponibles.
                      </p>
                    )}
                  </article>
                );
              })() : null}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
