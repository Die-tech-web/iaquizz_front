import type { AuthResponse, LoginPayload } from '../../../entities/auth/model/types';
import { httpClient } from '../../../shared/lib/http/httpClient';

export const authApi = {
  login(payload: LoginPayload) {
    return httpClient.post<LoginPayload, AuthResponse>('/auth/login', payload);
  },
};
