import { env } from '../../config/env';

const ENDPOINT = '/tts/wolof';

type WolofTtsErrorPayload = {
  message?: string | string[];
};

const resolveErrorMessage = async (response: Response) => {
  const fallback = `Erreur TTS (${response.status})`;
  try {
    const payload = (await response.json()) as WolofTtsErrorPayload;
    const message = Array.isArray(payload.message)
      ? payload.message.join(', ')
      : (payload.message ?? fallback);
    if (/<[a-z][\s\S]*>/i.test(message)) {
      return 'La génération audio Wolof est temporairement indisponible.';
    }
    return message;
  } catch {
    return 'La génération audio Wolof est temporairement indisponible.';
  }
};

export const synthesizeWolofAudio = async (text: string, token: string) => {
  const response = await fetch(new URL(ENDPOINT, env.apiBaseUrl).toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(await resolveErrorMessage(response));
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error('Audio Wolof vide.');
  }

  return blob;
};
