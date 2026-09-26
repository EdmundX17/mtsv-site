export type TurnstileCheck = {
  verified: boolean;
  error?: string;
};

export async function verifyTurnstileToken(token: string): Promise<TurnstileCheck> {
  try {
    const response = await fetch('/api/verify-turnstile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const result = await response.json();

    if (response.ok && result.success === true && result.verified === true) {
      return { verified: true };
    }

    return {
      verified: false,
      error: result.error || 'Cloudflare could not verify this check. Please try again.',
    };
  } catch {
    return {
      verified: false,
      error: 'Could not reach Cloudflare verification. Please check your connection and try again.',
    };
  }
}
