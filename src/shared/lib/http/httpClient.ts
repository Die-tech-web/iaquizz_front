import { env } from '../../config/env';

class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const makeUrl = (path: string, query?: Record<string, string | undefined>) => {
  const url = new URL(path, env.apiBaseUrl);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
  }

  return url.toString();
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const fallback = `Erreur API (${response.status})`;
    try {
      const payload = (await response.json()) as { message?: string | string[] };
      const message = Array.isArray(payload.message)
        ? payload.message.join(', ')
        : (payload.message ?? fallback);
      throw new HttpError(message, response.status);
    } catch {
      throw new HttpError(fallback, response.status);
    }
  }

  return (await response.json()) as T;
};

export const httpClient = {
  async get<T>(
    path: string,
    options?: { token?: string; query?: Record<string, string | undefined> },
  ): Promise<T> {
    const response = await fetch(makeUrl(path, options?.query), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
    });

    return parseResponse<T>(response);
  },

  async post<TRequest, TResponse>(
    path: string,
    body: TRequest,
    options?: { token?: string },
  ): Promise<TResponse> {
    const response = await fetch(makeUrl(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    return parseResponse<TResponse>(response);
  },
};

export { HttpError };
