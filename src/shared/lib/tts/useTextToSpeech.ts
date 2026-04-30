import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechSynthesisLanguage,
  type PatientLanguage,
} from '../i18n/language';
import { synthesizeWolofAudio } from './wolofTtsApi';

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

const pickVoiceForLanguage = (voices: SpeechSynthesisVoice[], language: string) => {
  if (!voices.length) {
    return null;
  }

  const normalizedLanguage = language.toLowerCase();
  const prefix = normalizedLanguage.slice(0, 2);
  return (
    voices.find((voice) => voice.lang.toLowerCase() === normalizedLanguage) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ??
    null
  );
};

interface UseTextToSpeechOptions {
  authToken?: string;
}

export const useTextToSpeech = (
  language: PatientLanguage,
  options: UseTextToSpeechOptions = {},
) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeText, setActiveText] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const wolofRequestIdRef = useRef(0);
  const speechLanguage = getSpeechSynthesisLanguage(language);
  const isWolof = language === 'wo';

  useEffect(() => {
    const supportsSpeechSynthesis =
      typeof window !== 'undefined'
      && 'speechSynthesis' in window
      && typeof window.SpeechSynthesisUtterance !== 'undefined';
    const supportsAudioElement =
      typeof window !== 'undefined' && typeof window.Audio !== 'undefined';

    const supported = isWolof ? supportsAudioElement : supportsSpeechSynthesis;
    setIsSupported(supported);
  }, [isWolof]);

  useEffect(() => {
    if (!isSupported || isWolof) {
      return;
    }

    const synth = window.speechSynthesis;
    const handleVoicesChanged = () => {
      synth.getVoices();
    };

    synth.getVoices();
    synth.addEventListener('voiceschanged', handleVoicesChanged);

    return () => {
      synth.removeEventListener('voiceschanged', handleVoicesChanged);
      synth.cancel();
      utteranceRef.current = null;
      setIsSpeaking(false);
      setActiveText(null);
    };
  }, [isSupported, isWolof]);

  const stopCurrentAudio = useCallback(() => {
    const audio = audioElementRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      audio.src = '';
      audioElementRef.current = null;
    }

    const previousUrl = audioObjectUrlRef.current;
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
      audioObjectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    stopCurrentAudio();
    wolofRequestIdRef.current += 1;
    utteranceRef.current = null;
    setIsSpeaking(false);
    setIsLoading(false);
    setActiveText(null);
    setError(null);
  }, [stopCurrentAudio]);

  const speakWithSpeechSynthesis = useCallback(
    (rawText: string) => {
      if (!isSupported) {
        return;
      }

      const text = normalize(rawText);
      if (!text) {
        return;
      }

      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickVoiceForLanguage(synth.getVoices(), speechLanguage);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = speechLanguage;
      }

      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          setIsSpeaking(false);
          setActiveText(null);
        }
      };

      utterance.onerror = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          setIsSpeaking(false);
          setActiveText(null);
        }
      };

      utteranceRef.current = utterance;
      setActiveText(text);
      setIsSpeaking(true);
      synth.speak(utterance);
    },
    [isSupported, speechLanguage],
  );

  const speakWithWolofTts = useCallback(
    async (rawText: string) => {
      const text = normalize(rawText);
      if (!text || !isSupported) {
        return;
      }
      if (!options.authToken) {
        setError('Connexion requise pour la lecture Wolof.');
        return;
      }

      stopCurrentAudio();
      setError(null);
      setIsLoading(true);
      setIsSpeaking(false);
      setActiveText(text);

      const requestId = wolofRequestIdRef.current + 1;
      wolofRequestIdRef.current = requestId;

      try {
        const blob = await synthesizeWolofAudio(text, options.authToken);
        if (wolofRequestIdRef.current !== requestId) {
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        audioObjectUrlRef.current = objectUrl;
        const audio = new Audio(objectUrl);
        audioElementRef.current = audio;

        audio.onended = () => {
          if (wolofRequestIdRef.current !== requestId) {
            return;
          }
          stopCurrentAudio();
          setIsSpeaking(false);
          setIsLoading(false);
          setActiveText(null);
          setError(null);
        };
        audio.onerror = () => {
          if (wolofRequestIdRef.current !== requestId) {
            return;
          }
          stopCurrentAudio();
          setIsSpeaking(false);
          setIsLoading(false);
          setActiveText(null);
          setError('Lecture Wolof indisponible pour le moment.');
        };

        await audio.play();
        if (wolofRequestIdRef.current !== requestId) {
          return;
        }

        setIsSpeaking(true);
        setIsLoading(false);
      } catch (err) {
        if (wolofRequestIdRef.current !== requestId) {
          return;
        }
        stopCurrentAudio();
        setIsSpeaking(false);
        setIsLoading(false);
        setActiveText(null);
        setError(err instanceof Error ? err.message : 'Échec de la synthèse Wolof.');
      }
    },
    [isSupported, options.authToken, stopCurrentAudio],
  );

  const speak = useCallback(
    (rawText: string) => {
      if (isWolof) {
        void speakWithWolofTts(rawText);
        return;
      }
      speakWithSpeechSynthesis(rawText);
    },
    [isWolof, speakWithSpeechSynthesis, speakWithWolofTts],
  );

  const toggleSpeak = useCallback(
    (rawText: string) => {
      const text = normalize(rawText);
      if (!text) {
        return;
      }

      if (isSpeaking && activeText === text) {
        stop();
        return;
      }

      speak(text);
    },
    [activeText, isSpeaking, speak, stop],
  );

  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, [stopCurrentAudio]);

  return {
    isSupported,
    isSpeaking,
    isLoading,
    error,
    activeText,
    speak,
    stop,
    toggleSpeak,
  };
};
