export interface PatientSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profile: string;
  currentLevel?: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  patient: PatientSummary;
}

export interface LoginPayload {
  email: string;
  password: string;
}
