import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSpeechSynthesisLanguage,
  type PatientLanguage,
} from '../i18n/language';

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

export const useTextToSpeech = (language: PatientLanguage) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [activeText, setActiveText] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechLanguage = getSpeechSynthesisLanguage(language);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof window.SpeechSynthesisUtterance !== 'undefined';
    setIsSupported(supported);
  }, []);

  useEffect(() => {
    if (!isSupported) {
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
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) {
      return;
    }

    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
    setActiveText(null);
  }, [isSupported]);

  const speak = useCallback(
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

  return {
    isSupported,
    isSpeaking,
    activeText,
    speak,
    stop,
    toggleSpeak,
  };
};
