import React, { useEffect, useRef, useState } from 'react';

type TurnstileRenderOptions = {
  sitekey: string;
  theme?: 'light' | 'dark' | 'auto';
  callback: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (code: string) => boolean | void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile-api]');
    const script = existingScript || document.createElement('script');

    const handleLoad = () => {
      if (window.turnstile) resolve();
      else reject(new Error('Cloudflare Turnstile did not initialize.'));
    };
    const handleError = () => reject(new Error('Cloudflare Turnstile could not be loaded.'));

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existingScript) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstileApi = 'true';
      document.head.appendChild(script);
    }
  });

  return turnstileScriptPromise;
}

export interface CloudflareTurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: unknown) => void;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  isInvalid?: boolean;
  resetKey?: number;
}

const siteKey = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY;

export const CloudflareTurnstile: React.FC<CloudflareTurnstileProps> = ({
  onVerify,
  onExpire,
  onError,
  theme = 'auto',
  className = '',
  isInvalid = false,
  resetKey = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbackRefs = useRef({ onVerify, onExpire, onError });
  const initialResetKeyRef = useRef(resetKey);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    callbackRefs.current = { onVerify, onExpire, onError };
  }, [onVerify, onExpire, onError]);

  useEffect(() => {
    if (!siteKey) {
      setLoadError('Turnstile is not configured. Add VITE_CLOUDFLARE_TURNSTILE_SITE_KEY in Vercel and redeploy.');
      return;
    }

    let isMounted = true;
    loadTurnstileScript()
      .then(() => {
        if (!isMounted || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: (token) => callbackRefs.current.onVerify(token),
          'expired-callback': () => callbackRefs.current.onExpire?.(),
          'error-callback': (code) => {
            setLoadError('Cloudflare verification could not load. Please refresh and try again.');
            callbackRefs.current.onError?.(code);
            return true;
          },
        });
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setLoadError('Cloudflare verification could not load. Please refresh and try again.');
        callbackRefs.current.onError?.(error);
      });

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [theme]);

  useEffect(() => {
    if (initialResetKeyRef.current === resetKey) return;
    initialResetKeyRef.current = resetKey;
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetKey]);

  return (
    <div
      className={`rounded-2xl border p-3.5 sm:p-4 ${
        isInvalid
          ? 'border-rose-500 ring-2 ring-rose-500/20'
          : 'border-neutral-200 dark:border-neutral-800'
      } ${className}`}
    >
      <div ref={containerRef} className="min-h-[65px]" />
      {loadError && (
        <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          {loadError}
        </p>
      )}
      {isInvalid && !loadError && (
        <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          Please complete the Cloudflare verification.
        </p>
      )}
    </div>
  );
};
