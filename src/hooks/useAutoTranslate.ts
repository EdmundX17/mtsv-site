import { useState, useEffect } from 'react';
import { translateText } from '../utils/autoTranslate';

export function useAutoTranslate(text: string, targetLanguage: string) {
  const [displayText, setDisplayText] = useState(text || '');
  const [isTranslated, setIsTranslated] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!text) {
      setDisplayText('');
      setIsTranslated(false);
      return;
    }

    if (!targetLanguage || targetLanguage === 'en' || targetLanguage !== 'es') {
      setDisplayText(text);
      setIsTranslated(false);
      return;
    }

    let isMounted = true;
    setIsTranslating(true);

    translateText(text, 'es')
      .then((translated) => {
        if (isMounted) {
          if (translated && translated !== text) {
            setDisplayText(translated);
            setIsTranslated(true);
          } else {
            setDisplayText(text);
            setIsTranslated(false);
          }
          setIsTranslating(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDisplayText(text);
          setIsTranslated(false);
          setIsTranslating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [text, targetLanguage]);

  const toggleOriginal = () => {
    setShowOriginal((prev) => !prev);
  };

  return {
    displayText: showOriginal ? text : displayText,
    isTranslated,
    showOriginal,
    toggleOriginal,
    isTranslating
  };
}
