import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  signOut,
  User,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId
};

// Initialize Firebase App instance safely
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth Instance
export const auth = getAuth(app);

// Configure local persistence
try {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Auth persistence warning:', err);
  });
} catch (e) {
  console.warn('Set persistence error:', e);
}

// Google Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Set Firestore log level to silent to suppress internal gRPC idle stream disconnects
try {
  setLogLevel('silent');
} catch (e) {
  // Ignore
}

// Firestore Database ID for this applet
const FIRESTORE_DATABASE_ID =
  (firebaseConfigData as any).firestoreDatabaseId ||
  'ai-studio-militarytycoonva-d16f20ea-1387-4fd1-8489-0514fef25c1d';

// Firestore Instance
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    },
    FIRESTORE_DATABASE_ID
  );
} catch (e) {
  firestoreInstance = getFirestore(app, FIRESTORE_DATABASE_ID);
}

export const db = firestoreInstance;

/**
 * Deeply cleans an object to strip undefined values so Firestore writes never fail.
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (data instanceof Date) return data;
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      result[key] = cleanForFirestore(value);
    }
  }
  return result as T;
}

// Sign in with Google ID Token / Credential (bypasses popup and handler redirects)
export async function signInWithGoogleIdToken(idToken: string): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);
  return userCredential.user;
}

// Check if there was a pending redirect login
export async function checkRedirectAuth(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return result.user;
    }
    return null;
  } catch (error: any) {
    console.warn('Redirect auth check warning:', error);
    return null;
  }
}

// Google Sign-In Helper with 12-second timeout & clear error messaging
export async function signInWithGoogle(): Promise<User> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          'POPUP_TIMEOUT: Google authentication popup did not complete. This occurs when third-party cookies/storage are blocked by the browser on this domain. Use the Staff Passkey login below for instant access.'
        )
      );
    }, 12000);
    return () => clearTimeout(timer);
  });

  try {
    const popupPromise = signInWithPopup(auth, googleProvider).then((res) => res.user);
    const user = await Promise.race([popupPromise, timeoutPromise]);
    return user;
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups or use the Staff Passkey tab.');
    }
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in popup was closed before completing authentication.');
    }
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error('Domain not authorized in Firebase Auth settings. Use the Staff Passkey tab below for instant login.');
    }
    if (error.code === 'auth/cancelled-popup-request') {
      throw new Error('Another sign-in window is already open or was cancelled.');
    }
    throw error;
  }
}

// Google Sign-In via Full Page Redirect
export async function signInWithGoogleRedirect(): Promise<void> {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error: any) {
    console.error('Google Redirect error:', error);
    throw error;
  }
}

// Google Sign-Out Helper
export async function logOutGoogle(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Google Sign-out error:', error);
    throw error;
  }
}

