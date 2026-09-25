// Google Authentication & User Profile Management
// Provides robust, cross-origin compatible Google Authentication without getting trapped in __/auth/handler

export interface AuthenticatedGoogleUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  providerId: 'google.com' | 'staff_passkey';
  emailVerified: boolean;
}

// Storage keys
const AUTH_STORAGE_KEY = 'mts_authenticated_google_user_v2';

// Get current saved user
export function getSavedAuthUser(): AuthenticatedGoogleUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse saved auth user:', e);
    return null;
  }
}

// Save authenticated user
export function saveAuthUser(user: AuthenticatedGoogleUser | null): void {
  try {
    if (!user) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
  } catch (e) {
    console.error('Failed to save auth user:', e);
  }
}

// Decode Google JWT ID Token (e.g. from Google Identity Services)
export function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode JWT token:', e);
    return null;
  }
}
