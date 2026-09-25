import { useState, useEffect, useCallback, useRef } from 'react';
import { translateText, translateBatch } from '../utils/autoTranslate';

export interface UseAutoTranslateResult {
  displayText: string;
  originalText: string;
  translatedText: string;
  isTranslating: boolean;
  isTranslated: boolean;
  showOriginal: boolean;
  toggleOriginal: () => void;
  setShowOriginal: (show: boolean) => void;
}

/**
 * Hook to automatically translate dynamic staff-written text (e.g., item descriptions, about me)
 * based on the active language.
 */
export function useAutoTranslate(
  text: string | undefined | null,
  targetLang: 'es' | 'en'
): UseAutoTranslateResult {
  const rawText = text || '';
  const [translatedText, setTranslatedText] = useState<string>(rawText);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const cancelRef = useRef<boolean>(false);

  useEffect(() => {
    cancelRef.current = false;
    const trimmed = rawText.trim();
    if (!trimmed) {
      setTranslatedText('');
      setIsTranslating(false);
      return;
    }

    setIsTranslating(true);
    translateText(trimmed, targetLang)
      .then((res) => {
        if (!cancelRef.current) {
          setTranslatedText(res);
          setIsTranslating(false);
        }
      })
      .catch(() => {
        if (!cancelRef.current) {
          setTranslatedText(rawText);
          setIsTranslating(false);
        }
      });

    return () => {
      cancelRef.current = true;
    };
  }, [rawText, targetLang]);

  const toggleOriginal = useCallback(() => {
    setShowOriginal((prev) => !prev);
  }, []);

  const isTranslated = Boolean(
    translatedText &&
    translatedText.trim() !== '' &&
    translatedText.trim() !== rawText.trim()
  );

  const displayText = showOriginal ? rawText : (translatedText || rawText);

  return {
    displayText,
    originalText: rawText,
    translatedText,
    isTranslating,
    isTranslated,
    showOriginal,
    toggleOriginal,
    setShowOriginal
  };
}

export interface UseAutoTranslateBatchResult {
  displayTexts: string[];
  originalTexts: string[];
  translatedTexts: string[];
  isTranslating: boolean;
  isTranslated: boolean;
  showOriginal: boolean;
  toggleOriginal: () => void;
  setShowOriginal: (show: boolean) => void;
}

/**
 * Hook to batch translate multiple strings (such as siteInfo title, description, announcement, bullets, team bios).
 */
export function useAutoTranslateBatch(
  texts: string[],
  targetLang: 'es' | 'en'
): UseAutoTranslateBatchResult {
  const [translatedTexts, setTranslatedTexts] = useState<string[]>(texts);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const cancelRef = useRef<boolean>(false);

  const serialized = JSON.stringify(texts);

  useEffect(() => {
    cancelRef.current = false;
    const items: string[] = JSON.parse(serialized);

    if (items.length === 0) {
      setTranslatedTexts([]);
      setIsTranslating(false);
      return;
    }

    setIsTranslating(true);
    translateBatch(items, targetLang)
      .then((res) => {
        if (!cancelRef.current) {
          setTranslatedTexts(res);
          setIsTranslating(false);
        }
      })
      .catch(() => {
        if (!cancelRef.current) {
          setTranslatedTexts(items);
          setIsTranslating(false);
        }
      });

    return () => {
      cancelRef.current = true;
    };
  }, [serialized, targetLang]);

  const toggleOriginal = useCallback(() => {
    setShowOriginal((prev) => !prev);
  }, []);

  const isTranslated = translatedTexts.some(
    (t, idx) => (t || '').trim() !== (texts[idx] || '').trim()
  );

  const displayTexts = showOriginal ? texts : (translatedTexts.length === texts.length ? translatedTexts : texts);

  return {
    displayTexts,
    originalTexts: texts,
    translatedTexts,
    isTranslating,
    isTranslated,
    showOriginal,
    toggleOriginal,
    setShowOriginal
  };
}
