const LOCAL_API_BASE_URL = 'http://localhost:3000';
const PRODUCTION_API_BASE_URL = 'https://backend-iaquizz.onrender.com';

const resolveApiBaseUrl = () => {
  const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (configuredApiBaseUrl && configuredApiBaseUrl.trim().length > 0) {
    return configuredApiBaseUrl;
  }

  return import.meta.env.PROD ? PRODUCTION_API_BASE_URL : LOCAL_API_BASE_URL;
};

export const env = Object.freeze({
  apiBaseUrl: resolveApiBaseUrl(),
});
