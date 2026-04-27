import { httpClient } from '../../../shared/lib/http/httpClient';
import type { PatientLanguage } from '../../../shared/lib/i18n/language';

interface UpdatePreferredLanguagePayload {
  preferredLanguage: PatientLanguage;
}

interface UpdatePreferredLanguageResponse {
  id: string;
  preferredLanguage: PatientLanguage;
}

export const patientApi = {
  updatePreferredLanguage(patientId: string, preferredLanguage: PatientLanguage, token: string) {
    return httpClient.patch<UpdatePreferredLanguagePayload, UpdatePreferredLanguageResponse>(
      `/patients/${patientId}/preferred-language`,
      { preferredLanguage },
      { token },
    );
  },
};
