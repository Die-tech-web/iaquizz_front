import type {
  AuthResponse,
  PatientAuthResponse,
  ProfessionalAuthResponse,
  LoginPayload,
} from '../../../entities/auth/model/types';
import { HttpError, httpClient } from '../../../shared/lib/http/httpClient';

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const body = {
      email: payload.email,
      password: payload.password,
    };

    try {
      return await httpClient.post<typeof body, PatientAuthResponse>('/auth/login', body);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 401) {
        throw error;
      }
    }

    return httpClient.post<typeof body, ProfessionalAuthResponse>(
      '/auth/login-professional',
      body,
    );
  },
};
