/**
 * Auto-translation utility for client-side consumption.
 * Interacts with /api/translate which provides fast translation with persistent caching.
 */

// In-memory client cache
const clientTranslationCache = new Map<string, string>();

// Local storage prefix
const STORAGE_PREFIX = 'mts_trans_v1_';

function getStorageKey(text: string, targetLang: string): string {
  // Simple hash or shortened key for storage
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return `${STORAGE_PREFIX}${targetLang}_${hash}_${text.length}`;
}

function getCached(text: string, targetLang: string): string | null {
  const memoryKey = `${targetLang}:::${text}`;
  if (clientTranslationCache.has(memoryKey)) {
    return clientTranslationCache.get(memoryKey)!;
  }

  try {
    const key = getStorageKey(text, targetLang);
    const stored = sessionStorage.getItem(key);
    if (stored) {
      clientTranslationCache.set(memoryKey, stored);
      return stored;
    }
  } catch {
    // Ignore session storage errors
  }

  return null;
}

function setCached(text: string, targetLang: string, translation: string): void {
  const memoryKey = `${targetLang}:::${text}`;
  clientTranslationCache.set(memoryKey, translation);

  try {
    const key = getStorageKey(text, targetLang);
    sessionStorage.setItem(key, translation);
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Translates a single string into targetLang ('es' | 'en').
 */
export async function translateText(text: string, targetLang: 'es' | 'en'): Promise<string> {
  const trimmed = text ? text.trim() : '';
  if (!trimmed) return text || '';

  const cached = getCached(trimmed, targetLang);
  if (cached !== null) {
    return cached;
  }

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, targetLang })
    });

    if (!res.ok) {
      throw new Error(`Translation HTTP ${res.status}`);
    }

    const data = await res.json();
    const result = data.translatedText || data.translations?.[0] || trimmed;
    setCached(trimmed, targetLang, result);
    return result;
  } catch (err) {
    console.warn('Auto-translate error, displaying original:', err);
    return text;
  }
}

/**
 * Translates an array of strings in a single batch.
 */
export async function translateBatch(texts: string[], targetLang: 'es' | 'en'): Promise<string[]> {
  if (!texts || texts.length === 0) return [];

  const results: string[] = new Array(texts.length);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  texts.forEach((txt, idx) => {
    const trimmed = (txt || '').trim();
    if (!trimmed) {
      results[idx] = txt || '';
      return;
    }

    const cached = getCached(trimmed, targetLang);
    if (cached !== null) {
      results[idx] = cached;
    } else {
      uncachedIndices.push(idx);
      uncachedTexts.push(trimmed);
    }
  });

  if (uncachedTexts.length === 0) {
    return results;
  }

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: uncachedTexts, targetLang })
    });

    if (!res.ok) {
      throw new Error(`Batch translation HTTP ${res.status}`);
    }

    const data = await res.json();
    const translations = data.translations as string[] || [];

    uncachedIndices.forEach((origIdx, chunkIdx) => {
      const trans = translations[chunkIdx] || uncachedTexts[chunkIdx];
      results[origIdx] = trans;
      setCached(uncachedTexts[chunkIdx], targetLang, trans);
    });
  } catch (err) {
    console.warn('Batch translation failed, fallback to original:', err);
    uncachedIndices.forEach((origIdx, chunkIdx) => {
      results[origIdx] = uncachedTexts[chunkIdx];
    });
  }

  return results;
}
