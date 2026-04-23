import { MEDICAL_NOTICE_TEXT, MEDICAL_NOTICE_SOURCES_TEXT } from '../shared/lib/quiz/medicalNotice';

interface MedicalNoticeProps {
  variant?: 'start' | 'end';
}

export function MedicalNotice({ variant = 'start' }: MedicalNoticeProps) {
  const title =
    variant === 'start'
      ? 'Information importante avant de démarrer'
      : 'Rappel important en fin de quiz';

  return (
    <section className="medical-notice" role="note" aria-label={title}>
      <p className="medical-notice__title">{title}</p>
      <p className="medical-notice__text">{MEDICAL_NOTICE_TEXT}</p>
      <p className="medical-notice__meta">{MEDICAL_NOTICE_SOURCES_TEXT}</p>
    </section>
  );
}
