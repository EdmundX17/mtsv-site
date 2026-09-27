import express from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfigData from './firebase-applet-config.json';
import { INITIAL_ITEMS } from './src/data/initialItems';
import { getVehicleImageUrl } from './src/data/vehicleImageMap';
import defaultWebhookConfig from './src/data/webhookConfig.json';

dotenv.config();

const scryptAsync = promisify(crypto.scrypt);
const STAFF_USERNAME_PATTERN = /^[a-z][a-z0-9._-]{2,39}$/;
const normalizeStaffUsername = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const newStaffSessionVersion = () => crypto.randomBytes(24).toString('base64url');
const newTemporaryPassword = () => crypto.randomBytes(24).toString('base64url');

async function hashStaffPassword(password: string, salt = crypto.randomBytes(24).toString('base64url')) {
  const hash = await scryptAsync(password, salt, 64) as Buffer;
  return { salt, passwordHash: hash.toString('base64url') };
}

async function matchesStaffPassword(password: string, salt: unknown, storedHash: unknown) {
  if (typeof salt !== 'string' || typeof storedHash !== 'string') return false;
  try {
    const expected = Buffer.from(storedHash, 'base64url');
    if (expected.length !== 64) return false;
    const actual = await scryptAsync(password, salt, 64) as Buffer;
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function enforceCookieSecurity(cookieStr: string): string {
  let modified = cookieStr;
  if (!/;\s*Secure/i.test(modified)) {
    modified += '; Secure';
  }
  if (!/;\s*HttpOnly/i.test(modified)) {
    modified += '; HttpOnly';
  }
  if (!/;\s*SameSite=/i.test(modified)) {
    modified += '; SameSite=Lax';
  }
  return modified;
}

/**
 * SSRF Protection Validator:
 * Ensures URLs only target public, non-internal, non-cloud-metadata HTTP/HTTPS resources.
 */
function isSafePublicUrl(urlString: string): { safe: boolean; reason?: string; parsedUrl?: URL } {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Forbidden protocol (only HTTP and HTTPS are permitted)' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block loopback, localhost, and internal cloud metadata domains
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === 'metadata.google.internal' ||
      hostname === 'metadata.google' ||
      hostname === 'instance-data' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return { safe: false, reason: 'Internal/loopback destinations are strictly forbidden' };
    }

    // IP address checks for private / reserved subnets
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const o1 = parseInt(match[1], 10);
      const o2 = parseInt(match[2], 10);

      if (
        o1 === 10 || // 10.0.0.0/8
        o1 === 127 || // 127.0.0.0/8
        (o1 === 172 && o2 >= 16 && o2 <= 31) || // 172.16.0.0/12
        (o1 === 192 && o2 === 168) || // 192.168.0.0/16
        (o1 === 169 && o2 === 254) || // 169.254.0.0/16 Link-local / Cloud metadata
        o1 === 0 || // 0.0.0.0/8
        o1 >= 224 // Multicast & Future use
      ) {
        return { safe: false, reason: 'Private or link-local IP addresses are forbidden' };
      }
    }

    return { safe: true, parsedUrl: parsed };
  } catch {
    return { safe: false, reason: 'Malformed URL' };
  }
}

/**
 * In-memory sliding-window Rate Limiter Middleware
 */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitStores = new Map<string, Map<string, RateLimitBucket>>();

function createRateLimiter(options: { windowMs: number; max: number; name: string }) {
  const store = new Map<string, RateLimitBucket>();
  rateLimitStores.set(options.name, store);

  // Clean up expired buckets periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store.entries()) {
      if (now > bucket.resetAt) {
        store.delete(key);
      }
    }
  }, 180000);

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ip = Array.isArray(rawIp) ? rawIp[0] : (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : 'unknown');
    const now = Date.now();

    let bucket = store.get(ip);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 1, resetAt: now + options.windowMs };
      store.set(ip, bucket);
    } else {
      bucket.count++;
    }

    const remaining = Math.max(0, options.max - bucket.count);
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > options.max) {
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please slow down and try again shortly.',
        retryAfterSeconds: retryAfterSec
      });
    }

    next();
  };
}

/**
 * File name sanitization helper to block path traversals and illegal characters
 */
function sanitizeFileName(name: string, fallbackPrefix: string = 'img'): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9_.\-\s]/g, '_').trim();
  const cleanExt = path.extname(base).toLowerCase();
  const allowedExtensions = ['.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.avif'];
  const ext = allowedExtensions.includes(cleanExt) ? cleanExt : '.webp';
  const nameWithoutExt = base.replace(/\.[^/.]+$/, '').substring(0, 80);
  const safeName = nameWithoutExt.trim() ? nameWithoutExt : `${fallbackPrefix}_${Date.now()}`;
  return `${safeName}${ext}`;
}

export async function createApp() {
  const app = express();
  const PORT = 3000;

  // Immediate Health check endpoint for container, Nginx & warmup probes
  app.get('/api/health', (_req, res) => {
    const firebaseAdminConfigured = Boolean(getServerDb());
    const turnstileSecretConfigured = Boolean(process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY);
    const turnstileSiteKeyConfigured = Boolean(process.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY);
    res.json({
      status: firebaseAdminConfigured && turnstileSecretConfigured && turnstileSiteKeyConfigured ? 'ok' : 'degraded',
      services: {
        firebaseAdmin: firebaseAdminConfigured,
        turnstileSecret: turnstileSecretConfigured,
        turnstileSiteKey: turnstileSiteKeyConfigured
      },
      timestamp: new Date().toISOString()
    });
  });

  // Disable Express fingerprinting header to prevent server software identification
  app.disable('x-powered-by');

  // Comprehensive Security Headers & Cookie Hardening Middleware (OWASP & Vulnerability Scanner Hardened)
  app.use((req, res, next) => {
    // Hide server technology
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // 1. Strict-Transport-Security (HSTS) - 1 full year, includeSubDomains, preload
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // 2. X-Content-Type-Options - Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 3. Referrer-Policy - Protect user privacy and referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 4. X-XSS-Protection - Enable legacy browser XSS filters
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // 5. Permissions-Policy - Disable dangerous/unnecessary browser features
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=()');

    // 6. Content-Security-Policy (CSP) - Configured cleanly to allow all required assets, Google fonts, Firebase, and iframe preview
    const cspDirectives = [
      "default-src 'self' https: data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob: data:",
      "style-src 'self' 'unsafe-inline' https: http: data: blob:",
      "style-src-elem 'self' 'unsafe-inline' https: http: data: blob:",
      "font-src 'self' data: https: http: blob:",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https: http: wss: ws: blob: data:",
      "frame-src 'self' https: blob: data:",
      "frame-ancestors 'self' https: http:",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ');
    res.setHeader('Content-Security-Policy', cspDirectives);

    // 8. Cookie Hardening - automatically enforce Secure, HttpOnly, and SameSite=Lax flags on all Set-Cookie headers
    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = function (name: string, value: any) {
      if (typeof name === 'string' && name.toLowerCase() === 'set-cookie') {
        if (Array.isArray(value)) {
          value = value.map(cookieStr => (typeof cookieStr === 'string' ? enforceCookieSecurity(cookieStr) : cookieStr));
        } else if (typeof value === 'string') {
          value = enforceCookieSecurity(value);
        }
      }
      return originalSetHeader(name, value);
    };

    next();
  });

  // Handle OPTIONS requests cleanly without leaking debug methods
  app.options('*', (req, res) => {
    res.setHeader('Allow', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
    res.status(204).end();
  });

  // Body parser with size limits
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Static route for vehicle images and permanent cached images
  const vehicleImagesDir = path.join(process.env.VERCEL ? os.tmpdir() : path.join(process.cwd(), 'public'), 'images', 'vehicles');
  const bundledVehicleImagesDir = path.join(process.cwd(), 'public', 'images', 'vehicles');
  const cachedImagesDir = path.join(process.env.VERCEL ? os.tmpdir() : path.join(process.cwd(), 'public'), 'images', 'cache');

  if (!fs.existsSync(vehicleImagesDir)) {
    fs.mkdirSync(vehicleImagesDir, { recursive: true });
  }
  if (!fs.existsSync(cachedImagesDir)) {
    fs.mkdirSync(cachedImagesDir, { recursive: true });
  }

  // Public project identifiers are safe to keep in the bundle; privileged access uses a
  // Firebase service account that must be supplied through server-only environment config.
  const EMBEDDED_FIREBASE_CONFIG = {
    projectId: firebaseConfigData.projectId,
    firestoreDatabaseId: firebaseConfigData.firestoreDatabaseId,
  };

  // Firebase Admin is required for server operations because the replacement Firestore
  // rules deny direct client access to protected collections.
  let serverDbInstance: FirebaseFirestore.Firestore | null = null;
  let serverAdminApp: ReturnType<typeof initializeApp> | null = null;
  function getFirebaseAdminApp() {
    if (serverAdminApp) return serverAdminApp;
    try {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!serviceAccountJson) return null;

      const serviceAccount = JSON.parse(serviceAccountJson);
      if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
        console.error('[Firebase Admin] Service account JSON is missing required fields.');
        return null;
      }
      serviceAccount.private_key = String(serviceAccount.private_key).replace(/\\n/g, '\n');

      const existing = getApps().find(app => app.name === 'mtsv-admin');
      serverAdminApp = existing || initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || EMBEDDED_FIREBASE_CONFIG.projectId
      }, 'mtsv-admin');
      return serverAdminApp;
    } catch (error) {
      console.error('[Firebase Admin] Could not initialize the configured service account.');
      return null;
    }
  }

  function getServerDb() {
    if (serverDbInstance) return serverDbInstance;
    try {
      const firebaseApp = getFirebaseAdminApp();
      if (!firebaseApp) return null;
      serverDbInstance = getFirestore(firebaseApp, EMBEDDED_FIREBASE_CONFIG.firestoreDatabaseId);
      return serverDbInstance;
    } catch (error) {
      console.error('[Firebase Admin] Firestore initialization failed.');
    }
    return null;
  }

  const getServerAuth = () => {
    const firebaseApp = getFirebaseAdminApp();
    return firebaseApp ? getAuth(firebaseApp) : null;
  };

  // Keep the existing server code's compact Firestore helper shape while routing
  // every operation through the Admin SDK.
  const collection = (db: FirebaseFirestore.Firestore, name: string) => db.collection(name);
  const doc = (db: FirebaseFirestore.Firestore, collectionName: string, documentId: string) =>
    db.collection(collectionName).doc(documentId);
  const getDoc = async (ref: FirebaseFirestore.DocumentReference) => {
    const snapshot = await ref.get();
    return { id: snapshot.id, exists: () => snapshot.exists, data: () => snapshot.data() };
  };
  const getDocs = (ref: FirebaseFirestore.Query | FirebaseFirestore.CollectionReference) => ref.get();
  const setDoc = (ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData, options?: FirebaseFirestore.SetOptions) =>
    ref.set(data, options);
  const deleteDoc = (ref: FirebaseFirestore.DocumentReference) => ref.delete();

  // Background hydration: automatically restores any missing images from Firestore storedImages to disk
  async function hydrateStoredImages() {
    try {
      const db = getServerDb();
      if (!db) return;
      const snap = await getDocs(collection(db, 'storedImages'));
      if (snap.empty) return;
      let restored = 0;
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const filename = data.filename || `${docSnap.id}.png`;
        const safeName = path.basename(filename);
        const filePath = path.join(vehicleImagesDir, safeName);
        if (!fs.existsSync(filePath) && data.dataUrl && typeof data.dataUrl === 'string') {
          const base64Data = data.dataUrl.includes(';base64,')
            ? data.dataUrl.split(';base64,').pop()
            : data.dataUrl;
          if (base64Data) {
            fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
            restored++;
          }
        }
      });
      if (restored > 0) {
        console.log(`[ImagePersistence] Restored ${restored} missing vehicle image(s) from Firestore.`);
      }
    } catch (err) {
      console.warn('[ImagePersistence] Hydration warning:', err);
    }
  }

  // Trigger background hydration non-blockingly
  if (!process.env.VERCEL) hydrateStoredImages().catch(e => console.warn('[ImagePersistence] Initial hydration error:', e));

  /**
   * GET /images/vehicles/:filename
   * Persistent vehicle image delivery:
   * 1. Checks disk cache first.
   * 2. If missing, automatically recovers on-demand from Firestore storedImages and caches to disk.
   * 3. Blocks falling through to SPA index.html so images never receive HTML.
   */
  app.get('/images/vehicles/:filename', async (req, res) => {
    try {
      const rawName = req.params.filename;
      if (!rawName || typeof rawName !== 'string') {
        return res.status(400).send('Invalid filename');
      }

      const decodedName = path.basename(decodeURIComponent(rawName));
      const cleanRaw = path.basename(rawName);

      const mimeMap: Record<string, string> = {
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.avif': 'image/avif'
      };

      // Candidate paths on disk (including underscore and space variations)
      const candidatePaths = [
        path.join(vehicleImagesDir, decodedName),
        path.join(vehicleImagesDir, cleanRaw),
        path.join(vehicleImagesDir, decodedName.replace(/\s+/g, '_')),
        path.join(vehicleImagesDir, decodedName.replace(/_/g, ' ')),
        path.join(vehicleImagesDir, decodedName.replace(/\.[^.]+$/, '.png')),
        path.join(vehicleImagesDir, decodedName.replace(/\.[^.]+$/, '.webp')),
        path.join(vehicleImagesDir, decodedName.replace(/\s+/g, '_').replace(/\.[^.]+$/, '.png')),
        path.join(vehicleImagesDir, decodedName.replace(/_/g, ' ').replace(/\.[^.]+$/, '.png'))
      ];

      for (const p of [...candidatePaths, ...candidatePaths.map(p => p.replace(vehicleImagesDir, bundledVehicleImagesDir))]) {
        if (fs.existsSync(p)) {
          const ext = path.extname(p).toLowerCase();
          res.setHeader('Content-Type', mimeMap[ext] || 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          return fs.createReadStream(p).pipe(res);
        }
      }

      // Check normalized filename against all files in vehicleImagesDir (e.g. "lehealingdrone" matches "LE_HealingDrone.png")
      const normalizedTarget = decodedName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (fs.existsSync(vehicleImagesDir)) {
        const diskFiles = fs.readdirSync(vehicleImagesDir);
        for (const file of diskFiles) {
          const normFile = file.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normFile === normalizedTarget || normFile.replace(/png|webp|jpe?g$/, '') === normalizedTarget.replace(/png|webp|jpe?g$/, '')) {
            const fullMatchPath = path.join(vehicleImagesDir, file);
            const ext = path.extname(fullMatchPath).toLowerCase();
            res.setHeader('Content-Type', mimeMap[ext] || 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            return fs.createReadStream(fullMatchPath).pipe(res);
          }
        }
      }

      // If not on disk, query Firestore storedImages for on-demand restoration
      const db = getServerDb();
      if (db) {
        const safeDocId = decodedName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        const altDocId = cleanRaw.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

        let docSnap = await getDoc(doc(db, 'storedImages', safeDocId));
        if (!docSnap.exists() && altDocId !== safeDocId) {
          docSnap = await getDoc(doc(db, 'storedImages', altDocId));
        }

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.dataUrl && typeof data.dataUrl === 'string') {
            const base64Data = data.dataUrl.includes(';base64,')
              ? data.dataUrl.split(';base64,').pop()
              : data.dataUrl;
            if (base64Data) {
              const buffer = Buffer.from(base64Data, 'base64');
              const savePath = path.join(vehicleImagesDir, decodedName);
              try {
                fs.writeFileSync(savePath, buffer);
              } catch (writeErr) {
                console.warn('[ImagePersistence] Disk cache write warning:', writeErr);
              }
              const contentTypeMatch = data.dataUrl.match(/data:(image\/[^;]+);/);
              res.setHeader('Content-Type', contentTypeMatch ? contentTypeMatch[1] : 'image/png');
              res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
              return res.send(buffer);
            }
          }
        }
      }

      // Explicit 404 text so it NEVER serves HTML
      return res.status(404).send('Vehicle image not found');
    } catch (err: any) {
      console.error('[Vehicle Image Error]:', err);
      return res.status(500).send('Error loading vehicle image');
    }
  });

  /**
   * GET /images/cache/:filename
   * Cached external image serving
   */
  app.get('/images/cache/:filename', (req, res) => {
    try {
      const cleanName = path.basename(decodeURIComponent(req.params.filename || ''));
      const filePath = path.join(cachedImagesDir, cleanName);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return fs.createReadStream(filePath).pipe(res);
      }
      return res.status(404).send('Cached image not found');
    } catch (err) {
      return res.status(500).send('Error loading cached image');
    }
  });

  // Standard express static for any other /images assets
  app.use('/images', express.static(path.join(process.cwd(), 'public', 'images'), {
    maxAge: '1y',
    immutable: true
  }));

  // Block any unmatched /images routes from falling through to Vite/SPA HTML
  app.all('/images/*', (req, res) => {
    res.status(404).send('Image not found');
  });

  /**
   * GET /sitemap.xml
   * Dynamically generated XML sitemap for search engines (Googlebot, Bingbot, etc.)
   * Indexes main site, calculator, static pages, and all Military Tycoon items
   */
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl = 'https://mtsvalues.com';
      const today = new Date().toISOString().split('T')[0];

      // Query live items from Firestore if available, otherwise fall back to INITIAL_ITEMS
      let itemsList = INITIAL_ITEMS;
      const db = getServerDb();
      if (db) {
        try {
          const snapshot = await getDocs(collection(db, 'items'));
          if (!snapshot.empty) {
            const fetched: any[] = [];
            snapshot.forEach(docSnap => {
              const data = docSnap.data();
              fetched.push({ ...data, id: docSnap.id });
            });
            if (fetched.length > 0) {
              itemsList = fetched;
            }
          }
        } catch (dbErr) {
          console.warn('[Sitemap] Failed to fetch live items from DB, using fallback:', dbErr);
        }
      }

      // Static and tool pages
      const staticPages = [
        { path: '', changefreq: 'daily', priority: '1.0' },
        { path: '/calculator', changefreq: 'weekly', priority: '0.9' },
        { path: '/tos', changefreq: 'monthly', priority: '0.3' }
      ];

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      for (const page of staticPages) {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}${page.path}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += '  </url>\n';
      }

      // Individual item URLs
      for (const item of itemsList) {
        if (!item.id) continue;
        const itemSlug = item.name ? item.name.toLowerCase().replace(/[^a-z0-9]/g, '') : item.id;
        const itemUrl = `${baseUrl}/item/${encodeURIComponent(itemSlug || item.id)}`;
        const lastMod = item.lastUpdated ? item.lastUpdated.split('T')[0] : today;
        xml += '  <url>\n';
        xml += `    <loc>${itemUrl}</loc>\n`;
        xml += `    <lastmod>${lastMod}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';
      }

      xml += '</urlset>';

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      return res.send(xml);
    } catch (sitemapErr) {
      console.error('[Sitemap Generation Error]:', sitemapErr);
      return res.status(500).send('Error generating sitemap');
    }
  });

  // Create rate limiters
  const apiLimiter = createRateLimiter({ windowMs: 60000, max: 200, name: 'api-general' });
  const proxyLimiter = createRateLimiter({ windowMs: 60000, max: 80, name: 'api-proxy' });
  const uploadLimiter = createRateLimiter({ windowMs: 60000, max: 40, name: 'api-upload' });
  const webhookLimiter = createRateLimiter({ windowMs: 60000, max: 50, name: 'api-webhooks' });
  const staffManagementLimiter = createRateLimiter({ windowMs: 60000, max: 30, name: 'api-staff-management' });
  const staffLoginLimiter = createRateLimiter({ windowMs: 60000, max: 8, name: 'api-staff-login' });

  // Apply general API rate limiter
  app.use('/api', apiLimiter);

  type StaffRoleName = 'Admin' | 'Analyst' | 'Staff' | 'Moderator' | 'Consultant';
  const validStaffRoles: StaffRoleName[] = ['Admin', 'Analyst', 'Staff', 'Moderator', 'Consultant'];
  const normalizeStaffRole = (value: unknown): StaffRoleName | null => {
    return validStaffRoles.includes(value as StaffRoleName) ? value as StaffRoleName : null;
  };
  const effectiveStaffRole = (role: StaffRoleName): StaffRoleName => role === 'Moderator' ? 'Staff' : role;

  const legacyCredentialMatches = (submitted: string, stored: string) => {
    const submittedDigest = crypto.createHash('sha256').update(submitted).digest();
    const storedDigest = crypto.createHash('sha256').update(stored).digest();
    return crypto.timingSafeEqual(submittedDigest, storedDigest);
  };

  const legacyRosterFingerprint = (members: any[]) => crypto.createHash('sha256').update(
    members.map(raw => JSON.stringify([
      normalizeStaffUsername(raw?.username),
      normalizeStaffRole(raw?.role) || '',
      typeof raw?.id === 'string' ? raw.id : '',
      typeof raw?.password === 'string' ? crypto.createHash('sha256').update(raw.password).digest('hex') : '',
      typeof raw?.displayName === 'string' ? raw.displayName : '',
      typeof raw?.addedBy === 'string' ? raw.addedBy : '',
      typeof raw?.addedAt === 'string' ? raw.addedAt : '',
      typeof raw?.lastLogin === 'string' ? raw.lastLogin : ''
    ])).sort().join('\n')
  ).digest('hex');

  // The old site kept passwords in the system roster. Import them only on the
  // server, hash them before writing, then replace the old roster with metadata.
  // A login-triggered migration requires a valid legacy credential and still
  // runs behind Turnstile and the staff-login rate limiter.
  const migrateLegacyStaffCredentials = async (
    db: FirebaseFirestore.Firestore,
    verifiedLogin?: { username: string; password: string }
  ): Promise<{ matched: boolean; imported: number; tooMany: boolean }> => {
    const rosterRef = db.collection('system').doc('staffRoster');
    const rosterSnapshot = await rosterRef.get();
    const rawMembers = Array.isArray(rosterSnapshot.data()?.members) ? rosterSnapshot.data()!.members : [];
    const matchingLegacyMember = verifiedLogin && rawMembers.find((raw: any) =>
      raw && typeof raw === 'object' &&
      normalizeStaffUsername(raw.username) === verifiedLogin.username &&
      typeof raw.password === 'string' && raw.password.length > 0 && raw.password.length <= 256 &&
      normalizeStaffRole(raw.role) !== null &&
      legacyCredentialMatches(verifiedLogin.password, raw.password)
    );

    if (verifiedLogin && !matchingLegacyMember) return { matched: false, imported: 0, tooMany: false };

    const prepared: Array<{
      username: string;
      password: string;
      role: StaffRoleName;
      uid: string;
      displayName: string;
      addedBy: string;
      addedAt: string;
      credentialRef: FirebaseFirestore.DocumentReference;
      roleRef: FirebaseFirestore.DocumentReference;
      passwordFields: { salt: string; passwordHash: string };
    }> = [];
    const seenUsernames = new Set<string>();

    for (const raw of rawMembers) {
      if (!raw || typeof raw !== 'object') continue;
      const username = normalizeStaffUsername(raw.username);
      const role = normalizeStaffRole(raw.role);
      const oldPassword = raw.password;
      if (
        !STAFF_USERNAME_PATTERN.test(username) || !role ||
        typeof oldPassword !== 'string' || oldPassword.length < 1 || oldPassword.length > 256 ||
        seenUsernames.has(username)
      ) continue;

      seenUsernames.add(username);
      const passwordFields = await hashStaffPassword(oldPassword);
      const uid = `staff_${crypto.randomBytes(18).toString('base64url')}`;
      const addedAt = typeof raw.addedAt === 'string' && !Number.isNaN(Date.parse(raw.addedAt))
        ? new Date(raw.addedAt).toISOString()
        : new Date(0).toISOString();
      prepared.push({
        username,
        password: oldPassword,
        role,
        uid,
        displayName: typeof raw.displayName === 'string' && raw.displayName.trim()
          ? raw.displayName.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120)
          : username,
        addedBy: typeof raw.addedBy === 'string' ? raw.addedBy.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120) : 'Legacy staff migration',
        addedAt,
        credentialRef: db.collection('staffCredentials').doc(username),
        roleRef: db.collection('staffRoles').doc(uid),
        passwordFields
      });
    }

    if (prepared.length > 240) return { matched: Boolean(matchingLegacyMember), imported: 0, tooMany: true };
    if (verifiedLogin && !prepared.some(member => member.username === verifiedLogin.username)) {
      return { matched: false, imported: 0, tooMany: false };
    }

    const bootstrapRef = db.collection('system').doc('staffAuthBootstrap');
    const migratedAt = new Date().toISOString();
    const expectedRosterFingerprint = legacyRosterFingerprint(rawMembers);
    const activeUidByUsername = new Map<string, string>();
    let importedCount = 0;
    await db.runTransaction(async transaction => {
      importedCount = 0;
      activeUidByUsername.clear();
      const currentRosterSnapshot = await transaction.get(rosterRef);
      const currentRawMembers = Array.isArray(currentRosterSnapshot.data()?.members)
        ? currentRosterSnapshot.data()!.members
        : [];
      if (legacyRosterFingerprint(currentRawMembers) !== expectedRosterFingerprint) {
        throw new Error('Legacy staff roster changed during migration.');
      }
      if (verifiedLogin) {
        const stillMatches = currentRawMembers.some((raw: any) =>
          raw && typeof raw === 'object' &&
          normalizeStaffUsername(raw.username) === verifiedLogin.username &&
          typeof raw.password === 'string' &&
          legacyCredentialMatches(verifiedLogin.password, raw.password)
        );
        if (!stillMatches) throw new Error('Legacy staff roster changed during migration.');
      }

      const credentialSnapshots = await Promise.all(prepared.map(member => transaction.get(member.credentialRef)));
      const bootstrapSnapshot = await transaction.get(bootstrapRef);

      for (let index = 0; index < prepared.length; index += 1) {
        const member = prepared[index];
        const existingCredential = credentialSnapshots[index];
        if (existingCredential.exists) {
          const existingUid = existingCredential.data()?.uid;
          if (typeof existingUid === 'string' && existingUid) activeUidByUsername.set(member.username, existingUid);
          continue;
        }

        transaction.create(member.credentialRef, {
          uid: member.uid,
          username: member.username,
          ...member.passwordFields,
          failedAttempts: 0,
          lockedUntil: 0,
          migratedFromLegacyRosterAt: migratedAt
        });
        transaction.set(member.roleRef, {
          role: member.role,
          username: member.username,
          displayName: member.displayName,
          sessionVersion: newStaffSessionVersion(),
          addedBy: member.addedBy,
          addedAt: member.addedAt
        }, { merge: true });
        activeUidByUsername.set(member.username, member.uid);
        importedCount += 1;
      }

      const sanitizedMembers: Array<Record<string, unknown>> = [];
      const sanitizedUsernames = new Set<string>();
      const sanitizedIds = new Set<string>();
      for (let index = 0; index < currentRawMembers.length; index += 1) {
        const raw = currentRawMembers[index];
        if (!raw || typeof raw !== 'object' || typeof raw.username !== 'string') continue;
        const role = normalizeStaffRole(raw.role);
        if (!role) continue;
        const originalUsername = raw.username.trim().slice(0, 80);
        const normalizedUsername = normalizeStaffUsername(originalUsername);
        if (!normalizedUsername) continue;
        const uid = activeUidByUsername.get(normalizedUsername);
        const rawId = typeof raw.id === 'string' ? raw.id.slice(0, 120) : '';
        const id = uid || (rawId && !rawId.includes('/') ? rawId : `legacy_${index}`);
        if (sanitizedUsernames.has(normalizedUsername) || sanitizedIds.has(id)) continue;
        sanitizedUsernames.add(normalizedUsername);
        sanitizedIds.add(id);
        sanitizedMembers.push({
          id,
          username: originalUsername,
          ...(typeof raw.displayName === 'string' && raw.displayName.trim()
            ? { displayName: raw.displayName.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120) }
            : {}),
          role,
          ...(typeof raw.addedBy === 'string' ? { addedBy: raw.addedBy.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120) } : {}),
          addedAt: typeof raw.addedAt === 'string' && !Number.isNaN(Date.parse(raw.addedAt))
            ? new Date(raw.addedAt).toISOString()
            : new Date(0).toISOString(),
          ...(typeof raw.lastLogin === 'string' ? { lastLogin: raw.lastLogin.slice(0, 80) } : {})
        });
      }

      transaction.set(rosterRef, { members: sanitizedMembers, updatedAt: migratedAt }, { merge: true });
      if (!bootstrapSnapshot.exists) {
        const firstAdmin = prepared.find(member => member.role === 'Admin');
        const adminUid = firstAdmin ? activeUidByUsername.get(firstAdmin.username) : undefined;
        if (adminUid) transaction.create(bootstrapRef, { uid: adminUid, createdAt: migratedAt });
      }
    });

    if (importedCount > 0) {
      console.info(`[Staff migration] Imported ${importedCount} legacy staff credentials; plaintext roster passwords removed.`);
    }
    return { matched: Boolean(matchingLegacyMember), imported: importedCount, tooMany: false };
  };

  const requireStaff = (allowedRoles: StaffRoleName[]) => async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const adminAuth = getServerAuth();
    const db = getServerDb();
    if (!adminAuth || !db) {
      return res.status(503).json({ success: false, error: 'Staff authentication is not configured on the server.' });
    }

    const authorization = req.header('authorization') || '';
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Sign in with your staff username to continue.' });
    }

    try {
      const decoded = await adminAuth.verifyIdToken(token, true);
      const roleSnapshot = await db.collection('staffRoles').doc(decoded.uid).get();
      const storedRole = normalizeStaffRole(roleSnapshot.exists ? roleSnapshot.data()?.role : null);
      if (!storedRole || decoded.staffLogin !== true || !roleSnapshot.data()?.sessionVersion || decoded.sessionVersion !== roleSnapshot.data()?.sessionVersion) {
        return res.status(403).json({ success: false, error: 'This account does not have an active staff role.' });
      }
      const role = effectiveStaffRole(storedRole);
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ success: false, error: 'Your staff role does not allow this action.' });
      }
      (req as any).staffUser = { uid: decoded.uid, username: roleSnapshot.data()?.username || '', role };
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Your staff session expired. Sign in again.' });
    }
  };

  const readSanitizedStaffRoster = async (db: FirebaseFirestore.Firestore) => {
    const migration = await migrateLegacyStaffCredentials(db);
    if (migration.tooMany) {
      throw new Error('The legacy roster is larger than the safe one-time migration limit.');
    }
    const rosterSnapshot = await getDoc(doc(db, 'system', 'staffRoster'));
    const rawMembers = rosterSnapshot.exists() && Array.isArray(rosterSnapshot.data()?.members)
      ? rosterSnapshot.data()!.members
      : [];
    const byId = new Map<string, Record<string, any>>();

    for (const raw of rawMembers) {
      if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.username !== 'string') continue;
      const role = normalizeStaffRole(raw.role);
      if (!role) continue;
      byId.set(raw.id, {
        id: raw.id,
        username: raw.username.slice(0, 80),
        linked: false,
        ...(typeof raw.displayName === 'string' ? { displayName: raw.displayName.slice(0, 120) } : {}),
        role,
        ...(typeof raw.addedBy === 'string' ? { addedBy: raw.addedBy.slice(0, 120) } : {}),
        addedAt: typeof raw.addedAt === 'string' ? raw.addedAt : new Date(0).toISOString(),
        ...(typeof raw.lastLogin === 'string' ? { lastLogin: raw.lastLogin } : {})
      });
    }

    // Active role records are the source of authorization truth. Include them in the
    // Admin roster even if the older roster document did not contain them.
    const roleSnapshots = await db.collection('staffRoles').get();
    await Promise.all(roleSnapshots.docs.map(async roleSnapshot => {
      const roleData = roleSnapshot.data();
      const role = normalizeStaffRole(roleData.role);
      if (!role) return;
      const existing = byId.get(roleSnapshot.id);
      const username = roleData.username || existing?.username || roleSnapshot.id;
      byId.set(roleSnapshot.id, {
        ...(existing || {}),
        id: roleSnapshot.id,
        username,
        linked: Boolean(roleData.sessionVersion),
        ...(roleData.displayName ? { displayName: roleData.displayName } : {}),
        role,
        addedBy: existing?.addedBy || roleData.addedBy || 'Administrator',
        addedAt: existing?.addedAt || roleData.addedAt || new Date(0).toISOString(),
        ...(existing?.lastLogin ? { lastLogin: existing.lastLogin } : {})
      });
    }));

    const members = [...byId.values()];
    // This also removes the old plaintext password fields from Firestore on the first
    // Admin roster load after deployment.
    await setDoc(doc(db, 'system', 'staffRoster'), { members, updatedAt: new Date().toISOString() }, { merge: true });
    return members;
  };

  // A username/password is checked only on the server. Firebase custom tokens give
  // the browser a signed identity for the existing Firestore role rules.
  app.post('/api/auth/login', staffLoginLimiter, async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const db = getServerDb();
    const adminAuth = getServerAuth();
    if (!db || !adminAuth) return res.status(503).json({ success: false, error: 'Staff authentication is not configured.' });

    const username = normalizeStaffUsername(req.body?.username);
    const password = req.body?.password;
    const turnstileToken = req.body?.turnstileToken;
    if (!STAFF_USERNAME_PATTERN.test(username) || typeof password !== 'string' || password.length < 1 || password.length > 256) {
      return res.status(400).json({ success: false, error: 'Enter a valid username and password.' });
    }
    if (typeof turnstileToken !== 'string' || !turnstileToken || turnstileToken.length > 2048) {
      return res.status(400).json({ success: false, error: 'Complete the security check.' });
    }
    const turnstileSecret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
    if (!turnstileSecret) return res.status(503).json({ success: false, error: 'Security verification is not configured.' });
    try {
      const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: turnstileSecret, response: turnstileToken, remoteip: req.ip || '' }).toString(),
        signal: AbortSignal.timeout(8000)
      });
      const outcome = verification.ok ? await verification.json() : null;
      if (outcome?.success !== true) return res.status(400).json({ success: false, error: 'Security check failed. Please try again.' });

      const credentialRef = db.collection('staffCredentials').doc(username);
      let credential = await credentialRef.get();
      if (!credential.exists) {
        const legacyMigration = await migrateLegacyStaffCredentials(db, { username, password });
        if (legacyMigration.tooMany) {
          return res.status(503).json({ success: false, error: 'The old staff roster is too large for automatic sign-in migration. Please contact an administrator.' });
        }
        if (legacyMigration.matched) credential = await credentialRef.get();
      }
      if (!credential.exists) {
        const bootstrapRef = db.collection('system').doc('staffAuthBootstrap');
        const configuredUsername = normalizeStaffUsername(process.env.STAFF_BOOTSTRAP_USERNAME);
        const configuredPassword = process.env.STAFF_BOOTSTRAP_PASSWORD || '';
        if (username === configuredUsername && STAFF_USERNAME_PATTERN.test(configuredUsername) && configuredPassword.length >= 16) {
          const bootstrap = await bootstrapRef.get();
          if (!bootstrap.exists && await matchesStaffPassword(password, 'bootstrap', (await hashStaffPassword(configuredPassword, 'bootstrap')).passwordHash)) {
            const uid = `staff_${crypto.randomBytes(18).toString('base64url')}`;
            const sessionVersion = newStaffSessionVersion();
            const passwordFields = await hashStaffPassword(password);
            const addedAt = new Date().toISOString();
            await db.runTransaction(async transaction => {
              const [existingBootstrap, existingCredential] = await Promise.all([transaction.get(bootstrapRef), transaction.get(credentialRef)]);
              if (existingBootstrap.exists || existingCredential.exists) throw new Error('Bootstrap already completed.');
              transaction.create(credentialRef, { uid, username, ...passwordFields, failedAttempts: 0, lockedUntil: 0 });
              transaction.create(db.collection('staffRoles').doc(uid), { role: 'Admin', username, displayName: username, sessionVersion, addedBy: 'Initial owner setup', addedAt });
              transaction.create(bootstrapRef, { uid, createdAt: addedAt });
            });
            credential = await credentialRef.get();
          }
        }
      }

      const data = credential.data();
      if (!data || Date.now() < (Number(data.lockedUntil) || 0)) {
        await hashStaffPassword(password, 'unknown-user');
        return res.status(401).json({ success: false, error: 'Incorrect username or password, or this account is temporarily locked.' });
      }
      const valid = await matchesStaffPassword(password, data.salt, data.passwordHash);
      if (!valid) {
        await db.runTransaction(async transaction => {
          const latest = await transaction.get(credentialRef);
          const attempts = (Number(latest.data()?.failedAttempts) || 0) + 1;
          transaction.update(credentialRef, { failedAttempts: attempts >= 5 ? 0 : attempts, lockedUntil: attempts >= 5 ? Date.now() + 15 * 60_000 : 0 });
        });
        return res.status(401).json({ success: false, error: 'Incorrect username or password, or this account is temporarily locked.' });
      }
      const session = await db.runTransaction(async transaction => {
        const currentCredential = await transaction.get(credentialRef);
        if (currentCredential.data()?.passwordHash !== data.passwordHash || Date.now() < (Number(currentCredential.data()?.lockedUntil) || 0)) {
          throw new Error('Credentials changed during sign-in.');
        }
        const role = await transaction.get(db.collection('staffRoles').doc(data.uid));
        if (!normalizeStaffRole(role.data()?.role) || role.data()?.username !== username || !role.data()?.sessionVersion) {
          throw new Error('Inactive staff role.');
        }
        transaction.update(credentialRef, { failedAttempts: 0, lockedUntil: 0 });
        return { uid: data.uid as string, sessionVersion: role.data()!.sessionVersion as string };
      });
      const customToken = await adminAuth.createCustomToken(session.uid, { staffLogin: true, sessionVersion: session.sessionVersion });
      return res.json({ success: true, customToken });
    } catch (error: any) {
      console.error('[Staff login] Request failed:', error?.code || error?.message || 'unknown');
      return res.status(503).json({ success: false, error: 'Sign-in is unavailable. Please try again shortly.' });
    }
  });

  app.get('/api/staff/accounts', staffManagementLimiter, requireStaff(['Admin']), async (_req, res) => {
    try {
      const db = getServerDb();
      if (!db) return res.status(503).json({ success: false, error: 'Staff storage is not configured.' });
      return res.json({ success: true, members: await readSanitizedStaffRoster(db) });
    } catch (error) {
      console.error('[Staff roster] Could not load the sanitized roster.');
      return res.status(500).json({ success: false, error: 'Could not load staff accounts.' });
    }
  });

  app.post('/api/staff/change-password', staffManagementLimiter, requireStaff(['Admin', 'Analyst', 'Staff', 'Consultant']), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const db = getServerDb();
    const adminAuth = getServerAuth();
    if (!db || !adminAuth) return res.status(503).json({ success: false, error: 'Staff authentication is not configured.' });
    const currentPassword = req.body?.currentPassword;
    const newPassword = req.body?.newPassword;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128) {
      return res.status(400).json({ success: false, error: 'The new password must be 12–128 characters.' });
    }
    const staff = (req as any).staffUser as { uid: string; username: string };
    const credentialRef = db.collection('staffCredentials').doc(normalizeStaffUsername(staff.username));
    try {
      const credential = await credentialRef.get();
      if (credential.data()?.uid !== staff.uid || !await matchesStaffPassword(currentPassword, credential.data()?.salt, credential.data()?.passwordHash)) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
      }
      const passwordFields = await hashStaffPassword(newPassword);
      await db.runTransaction(async transaction => {
        const current = await transaction.get(credentialRef);
        if (current.data()?.uid !== staff.uid || current.data()?.passwordHash !== credential.data()?.passwordHash) throw new Error('Password changed concurrently.');
        transaction.update(credentialRef, { ...passwordFields, failedAttempts: 0, lockedUntil: 0 });
        transaction.update(db.collection('staffRoles').doc(staff.uid), { sessionVersion: newStaffSessionVersion() });
      });
      await adminAuth.revokeRefreshTokens(staff.uid).catch(() => undefined);
      return res.json({ success: true });
    } catch {
      return res.status(503).json({ success: false, error: 'Password could not be changed. Please try again.' });
    }
  });

  app.post('/api/staff/accounts', staffManagementLimiter, requireStaff(['Admin']), async (req, res) => {
    const db = getServerDb();
    const adminAuth = getServerAuth();
    if (!db || !adminAuth) return res.status(503).json({ success: false, error: 'Staff management is not configured.' });

    try {
      const actingAdmin = (req as any).staffUser as { uid: string; username: string };
      const members = await readSanitizedStaffRoster(db);
      const { action } = req.body || {};

      if (action === 'import-legacy') {
        if (!Array.isArray(req.body.members)) {
          return res.status(400).json({ success: false, error: 'Legacy staff profiles must be a list.' });
        }
        const nextMembers = [...members];
        const existingIds = new Set(nextMembers.map(member => member.id));
        const existingUsernames = new Set(nextMembers.map(member => String(member.username || '').toLowerCase()));
        const roleValues = new Set(['Admin', 'Analyst', 'Staff', 'Moderator', 'Consultant']);
        for (const raw of req.body.members.slice(0, 200)) {
          if (!raw || typeof raw !== 'object') continue;
          const id = typeof raw.id === 'string' ? raw.id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) : '';
          const username = typeof raw.username === 'string'
            ? raw.username.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 80)
            : '';
          const role = roleValues.has(raw.role) ? normalizeStaffRole(raw.role) : null;
          if (!id || !username || !role || existingIds.has(id) || existingUsernames.has(username.toLowerCase())) continue;
          const addedAt = typeof raw.addedAt === 'string' && !Number.isNaN(Date.parse(raw.addedAt))
            ? new Date(raw.addedAt).toISOString()
            : new Date(0).toISOString();
          const member = {
            id,
            username,
            ...(typeof raw.displayName === 'string' && raw.displayName.trim()
              ? { displayName: raw.displayName.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120) }
              : {}),
            role,
            addedBy: 'Legacy roster migration',
            addedAt,
            ...(typeof raw.lastLogin === 'string' && !Number.isNaN(Date.parse(raw.lastLogin))
              ? { lastLogin: new Date(raw.lastLogin).toISOString() }
              : {})
          };
          nextMembers.push(member);
          existingIds.add(id);
          existingUsernames.add(username.toLowerCase());
        }
        await setDoc(doc(db, 'system', 'staffRoster'), { members: nextMembers, updatedAt: new Date().toISOString() }, { merge: true });
        return res.json({ success: true, imported: nextMembers.length - members.length, members: nextMembers });
      }

      if (action === 'create') {
        const username = normalizeStaffUsername(req.body.username);
        if (!STAFF_USERNAME_PATTERN.test(username)) return res.status(400).json({ success: false, error: 'Use 3–40 characters: letters, numbers, dots, dashes, or underscores; start with a letter.' });
        const legacyMemberId = typeof req.body.legacyMemberId === 'string' ? req.body.legacyMemberId : '';
        const legacyMember = legacyMemberId ? members.find(member => member.id === legacyMemberId && !member.linked) : undefined;
        if (legacyMemberId && !legacyMember) {
          return res.status(400).json({ success: false, error: 'The selected legacy staff profile is unavailable or already linked.' });
        }
        const role = legacyMember ? normalizeStaffRole(legacyMember.role) : normalizeStaffRole(req.body.role);
        if (!role) return res.status(400).json({ success: false, error: 'Select a valid staff role.' });
        const displayName = (typeof req.body.displayName === 'string' && req.body.displayName.trim())
          || legacyMember?.displayName
          || legacyMember?.username
          || username;
        const uid = legacyMember && (await db.collection('staffRoles').doc(legacyMember.id).get()).exists
          ? legacyMember.id : `staff_${crypto.randomBytes(18).toString('base64url')}`;
        const temporaryPassword = newTemporaryPassword();
        const passwordFields = await hashStaffPassword(temporaryPassword);
        const sessionVersion = newStaffSessionVersion();
        const addedAt = new Date().toISOString();
        const credentialRef = db.collection('staffCredentials').doc(username);
        const roleRef = db.collection('staffRoles').doc(uid);
        try {
          await db.runTransaction(async transaction => {
            const [existingCredential, existingRole] = await Promise.all([transaction.get(credentialRef), transaction.get(roleRef)]);
            if (existingCredential.exists) throw new Error('Username already exists.');
            if (existingRole.exists && existingRole.data()?.sessionVersion) throw new Error('Staff account is already linked.');
            transaction.create(credentialRef, { uid, username, ...passwordFields, failedAttempts: 0, lockedUntil: 0 });
            transaction.set(roleRef, { role, username, displayName, sessionVersion, addedBy: actingAdmin.username || actingAdmin.uid, addedAt });
          });
        } catch (error: any) {
          if (error?.message === 'Username already exists.' || error?.message === 'Staff account is already linked.') {
            return res.status(409).json({ success: false, error: error.message });
          }
          throw error;
        }
        const nextMembers = members.filter(member => member.id !== legacyMemberId && member.id !== uid).concat({
          id: uid, username, linked: true, displayName, role,
          addedBy: actingAdmin.username || actingAdmin.uid,
          addedAt: legacyMember?.addedAt || addedAt
        });
        await setDoc(doc(db, 'system', 'staffRoster'), { members: nextMembers, updatedAt: addedAt }, { merge: true });
        res.setHeader('Cache-Control', 'no-store');
        return res.status(201).json({ success: true, role, members: nextMembers, temporaryPassword });
      }

      if (action === 'role') {
        const memberId = typeof req.body.memberId === 'string' ? req.body.memberId : '';
        const newRole = normalizeStaffRole(req.body.role);
        const member = members.find(entry => entry.id === memberId);
        if (!member || !newRole) return res.status(400).json({ success: false, error: 'Select a staff member and a valid role.' });
        const roleRef = db.collection('staffRoles').doc(memberId);
        const roleSnapshot = await roleRef.get();
        if (roleSnapshot.exists) {
          if (roleSnapshot.data()?.role === 'Admin' && newRole !== 'Admin') {
            const admins = await db.collection('staffRoles').where('role', '==', 'Admin').get();
            if (admins.docs.filter(entry => Boolean(entry.data().sessionVersion)).length <= 1) return res.status(409).json({ success: false, error: 'The last Administrator cannot be demoted.' });
          }
          await roleRef.set({ role: newRole }, { merge: true });
        }
        const nextMembers = members.map(entry => entry.id === memberId ? { ...entry, role: newRole } : entry);
        await setDoc(doc(db, 'system', 'staffRoster'), { members: nextMembers, updatedAt: new Date().toISOString() }, { merge: true });
        return res.json({ success: true, members: nextMembers });
      }

      if (action === 'reset-password') {
        const member = members.find(entry => entry.id === req.body.memberId && entry.linked);
        if (!member) return res.status(404).json({ success: false, error: 'Linked staff account not found.' });
        const temporaryPassword = newTemporaryPassword();
        const passwordFields = await hashStaffPassword(temporaryPassword);
        const credentialRef = db.collection('staffCredentials').doc(normalizeStaffUsername(member.username));
        const roleRef = db.collection('staffRoles').doc(member.id);
        await db.runTransaction(async transaction => {
          const [credential, role] = await Promise.all([transaction.get(credentialRef), transaction.get(roleRef)]);
          if (credential.data()?.uid !== member.id || !role.exists) throw new Error('Staff account no longer exists.');
          transaction.update(credentialRef, { ...passwordFields, failedAttempts: 0, lockedUntil: 0 });
          transaction.update(roleRef, { sessionVersion: newStaffSessionVersion() });
        });
        await adminAuth.revokeRefreshTokens(member.id).catch(() => undefined);
        res.setHeader('Cache-Control', 'no-store');
        return res.json({ success: true, temporaryPassword });
      }

      if (action === 'remove') {
        const memberId = typeof req.body.memberId === 'string' ? req.body.memberId : '';
        const member = members.find(entry => entry.id === memberId);
        if (!member) return res.status(404).json({ success: false, error: 'Staff member not found.' });
        const roleRef = db.collection('staffRoles').doc(memberId);
        const roleSnapshot = await roleRef.get();
        if (roleSnapshot.exists && roleSnapshot.data()?.role === 'Admin') {
          const admins = await db.collection('staffRoles').where('role', '==', 'Admin').get();
          if (member.linked && admins.docs.filter(entry => Boolean(entry.data().sessionVersion)).length <= 1) return res.status(409).json({ success: false, error: 'The last Administrator cannot be removed.' });
        }
        await db.runTransaction(async transaction => {
          if (member.linked) transaction.delete(db.collection('staffCredentials').doc(normalizeStaffUsername(member.username)));
          if (roleSnapshot.exists) transaction.delete(roleRef);
        });
        await adminAuth.revokeRefreshTokens(memberId).catch(() => undefined);
        const nextMembers = members.filter(entry => entry.id !== memberId);
        await setDoc(doc(db, 'system', 'staffRoster'), { members: nextMembers, updatedAt: new Date().toISOString() }, { merge: true });
        return res.json({ success: true, members: nextMembers });
      }

      return res.status(400).json({ success: false, error: 'Unknown staff account action.' });
    } catch (error: any) {
      const message = 'Could not update staff accounts. Please try again.';
      console.error('[Staff account management] Request failed:', error?.code || 'unknown error');
      return res.status(500).json({ success: false, error: message });
    }
  });

  // Translation helpers, in-memory cache and Firestore persistent storage
  const translateLimiter = createRateLimiter({ windowMs: 60000, max: 120, name: 'api-translate' });
  const translationMemoryCache = new Map<string, string>();

  function getTranslationHash(key: string): string {
    return crypto.createHash('md5').update(key).digest('hex');
  }

  let isFirestoreTranslationsLoaded = false;
  let firestoreTranslationsLoadingPromise: Promise<void> | null = null;

  async function ensureFirestoreTranslationsLoaded(): Promise<void> {
    if (isFirestoreTranslationsLoaded) return;
    if (firestoreTranslationsLoadingPromise) return firestoreTranslationsLoadingPromise;

    firestoreTranslationsLoadingPromise = (async () => {
      try {
        const db = getServerDb();
        if (!db) return;
        const snap = await getDocs(collection(db, 'system'));
        const data = snap.docs.find(item => item.id === 'translations')?.data();
        if (data) {
          const entries = data?.entries;
          if (entries && typeof entries === 'object') {
            let count = 0;
            for (const item of Object.values(entries)) {
              if (item && typeof item === 'object' && (item as any).k && (item as any).t) {
                translationMemoryCache.set((item as any).k, (item as any).t);
                count++;
              } else if (typeof item === 'string') {
                count++;
              }
            }
            if (count > 0) {
              console.log(`[TranslationPersistence] Loaded ${count} persistent translations from Firestore system/translations.`);
            }
          }
        }
      } catch (err) {
        console.warn('[TranslationPersistence] Could not load translations from Firestore:', err);
      } finally {
        isFirestoreTranslationsLoaded = true;
        firestoreTranslationsLoadingPromise = null;
      }
    })();

    return firestoreTranslationsLoadingPromise;
  }

  // Pre-load persistent translations on server startup
  ensureFirestoreTranslationsLoaded().catch(e => console.warn('[TranslationPersistence] Initial load error:', e));

  async function persistTranslationsToFirestore(newEntries: Array<{ key: string; text: string }>): Promise<void> {
    if (newEntries.length === 0) return;
    try {
      const db = getServerDb();
      if (!db) return;
      const updatePayload: Record<string, any> = {};
      for (const entry of newEntries) {
        const hash = getTranslationHash(entry.key);
        updatePayload[`entries.${hash}`] = {
          k: entry.key,
          t: entry.text,
          u: new Date().toISOString()
        };
      }
      await setDoc(doc(db, 'system', 'translations'), updatePayload, { merge: true });
    } catch (err) {
      console.warn('[TranslationPersistence] Failed to persist translations to Firestore:', err);
    }
  }

  async function freeGtxTranslate(text: string, targetLang: string): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return text;
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) return text;
      const data = (await res.json()) as any;
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((s: any) => (Array.isArray(s) && typeof s[0] === 'string' ? s[0] : '')).join('');
        return translated || text;
      }
      return text;
    } catch {
      return text;
    }
  }

  /**
   * POST /api/translate
   * 100% Free automatic translation endpoint using Google Translate with persistent Firestore storage and in-memory caching.
   * Zero Gemini API calls = $0.00 cost.
   * Translates single text or array of texts between English and Spanish.
   */
  app.post('/api/translate', translateLimiter, async (req, res) => {
    try {
      await ensureFirestoreTranslationsLoaded();

      const { text, texts, targetLang = 'es' } = req.body;
      const normalizedTarget = targetLang === 'en' ? 'en' : 'es';

      let inputList: string[] = [];
      let isSingle = false;

      if (typeof text === 'string') {
        inputList = [text];
        isSingle = true;
      } else if (Array.isArray(texts)) {
        inputList = texts.map(t => (typeof t === 'string' ? t : ''));
      } else {
        return res.status(400).json({ error: 'text (string) or texts (string[]) is required' });
      }

      if (inputList.length === 0) {
        return res.json({ translations: [], translatedText: '' });
      }

      // Check cache for each item
      const results: string[] = new Array(inputList.length);
      const uncachedIndices: number[] = [];
      const uncachedTexts: string[] = [];

      inputList.forEach((t, idx) => {
        const trimmed = t.trim();
        if (!trimmed) {
          results[idx] = t;
          return;
        }
        const cacheKey = `${normalizedTarget}:::${trimmed}`;
        if (translationMemoryCache.has(cacheKey)) {
          results[idx] = translationMemoryCache.get(cacheKey)!;
        } else {
          uncachedIndices.push(idx);
          uncachedTexts.push(trimmed);
        }
      });

      if (uncachedTexts.length > 0) {
        // Translate all uncached strings using 100% free Google Translate
        const translatedChunk = await Promise.all(
          uncachedTexts.map(t => freeGtxTranslate(t, normalizedTarget))
        );

        // Store into results, memory cache, and prepare persistent store
        const newlyTranslated: Array<{ key: string; text: string }> = [];
        uncachedIndices.forEach((origIdx, chunkIdx) => {
          const trans = translatedChunk[chunkIdx] || uncachedTexts[chunkIdx];
          results[origIdx] = trans;
          const cacheKey = `${normalizedTarget}:::${uncachedTexts[chunkIdx]}`;
          translationMemoryCache.set(cacheKey, trans);
          newlyTranslated.push({ key: cacheKey, text: trans });
        });

        if (newlyTranslated.length > 0) {
          // Persist to Firestore so all future containers and restarts have it instantly
          persistTranslationsToFirestore(newlyTranslated).catch(err =>
            console.warn('[TranslationPersistence] Async persist error:', err)
          );
        }
      }

      return res.json({
        translations: results,
        translatedText: isSingle ? results[0] : (results[0] || ''),
        targetLang: normalizedTarget
      });
    } catch (error: any) {
      console.error('Error in /api/translate:', error);
      return res.status(500).json({ error: 'Translation failed', details: error.message });
    }
  });

  /**
   * GET /api/proxy-image?url=...
   * Fetches remote images (including Discord CDN links) and permanently caches them on disk.
   * Hardened against SSRF, internal port scanning, and buffer exhaustion.
   */
  app.get('/api/proxy-image', proxyLimiter, async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl || typeof targetUrl !== 'string') {
        return res.status(400).send('URL query parameter is required');
      }

      // SSRF validation
      const urlCheck = isSafePublicUrl(targetUrl);
      if (!urlCheck.safe) {
        return res.status(403).send(`Forbidden URL: ${urlCheck.reason}`);
      }

      // Generate a deterministic cache key from the clean URL
      const urlObj = urlCheck.parsedUrl!;
      const pathname = urlObj.pathname;
      const cleanPathKey = pathname.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
      const hash = Buffer.from(targetUrl).toString('base64url').substring(0, 32);
      const cacheFilename = `${cleanPathKey}_${hash}.webp`;
      const cacheFilePath = path.join(cachedImagesDir, cacheFilename);

      // Check if already cached on disk
      if (fs.existsSync(cacheFilePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Content-Type', 'image/webp');
        return fs.createReadStream(cacheFilePath).pipe(res);
      }

      // Fetch from remote source with 10s timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().startsWith('image/') && !contentType.toLowerCase().includes('octet-stream')) {
        return res.status(400).send('Remote resource is not a valid image format');
      }

      const arrayBuffer = await response.arrayBuffer();
      // Enforce 15MB max file limit
      if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
        return res.status(413).send('Image exceeds maximum allowed size (15MB)');
      }

      const buffer = Buffer.from(arrayBuffer);

      // Cache asynchronously to disk
      try {
        fs.writeFileSync(cacheFilePath, buffer);
      } catch (cacheErr) {
        console.warn('[Proxy-Image] Disk write error:', cacheErr);
      }

      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Type', contentType || 'image/webp');
      return res.send(buffer);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return res.status(504).send('Image request timed out');
      }
      return res.status(500).send('Image proxy error');
    }
  });

  /**
   * POST /api/cache-image
   * Accepts a remote URL (e.g. Discord link) and downloads it immediately, returning the local cached URL
   */
  app.post('/api/cache-image', uploadLimiter, requireStaff(['Admin', 'Staff']), async (req, res) => {
    try {
      const { url, name } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ success: false, error: 'Valid URL is required' });
      }

      // SSRF validation
      const urlCheck = isSafePublicUrl(url);
      if (!urlCheck.safe) {
        return res.status(403).json({ success: false, error: `Forbidden URL: ${urlCheck.reason}` });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(400).json({ success: false, error: `Failed to download image: ${response.statusText}` });
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
        return res.status(413).json({ success: false, error: 'Image exceeds size limit (15MB)' });
      }

      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      const contentType = response.headers.get('content-type') || 'image/png';
      const dataUrl = `data:${contentType};base64,${base64Data}`;

      const safeName = sanitizeFileName(name || `img_${Date.now()}`);
      const filePath = path.join(vehicleImagesDir, safeName);
      fs.writeFileSync(filePath, buffer);
      const db = getServerDb();
      if (!db) return res.status(503).json({ success: false, error: 'Image storage unavailable' });
      await setDoc(doc(db, 'storedImages', safeName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()), {
        filename: safeName, dataUrl, updatedAt: new Date().toISOString()
      }, { merge: true });

      return res.json({
        success: true,
        url: `/images/vehicles/${encodeURIComponent(safeName)}`,
        dataUrl: dataUrl.length < 50000 ? dataUrl : undefined
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Download error' });
    }
  });

  /**
   * GET /api/vehicle-images
   * Returns a list of all vehicle images stored on disk
   */
  app.get('/api/vehicle-images', async (req, res) => {
    try {
      if (!fs.existsSync(vehicleImagesDir)) {
        return res.json({ success: true, count: 0, files: [] });
      }
      const files = new Set([...fs.readdirSync(bundledVehicleImagesDir), ...fs.readdirSync(vehicleImagesDir)]);
      const db = getServerDb();
      if (db) {
        const stored = await getDocs(collection(db, 'storedImages'));
        stored.forEach(item => { if (item.data().filename) files.add(item.data().filename); });
      }
      return res.json({
        success: true,
        count: files.size,
        files: [...files].map(filename => ({
          filename,
          url: `/images/vehicles/${encodeURIComponent(filename)}`
        }))
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve vehicle images' });
    }
  });

  /**
   * POST & DELETE /api/delete-vehicle-image
   * Deletes an old or replaced vehicle image from disk and Firestore storedImages to free storage
   */
  const handleDeleteVehicleImage = async (req: express.Request, res: express.Response) => {
    try {
      const { filename, url } = req.body || {};
      let targetName = filename;
      if (!targetName && url && typeof url === 'string') {
        const cleanUrl = url.split('?')[0].split('#')[0];
        const parts = cleanUrl.split('/');
        targetName = parts[parts.length - 1];
      }
      if (!targetName || typeof targetName !== 'string') {
        return res.status(400).json({ success: false, error: 'Filename or URL is required' });
      }

      const decodedTarget = decodeURIComponent(targetName);
      const safeName = sanitizeFileName(decodedTarget);
      const rawBase = path.basename(decodedTarget);

      // Protect essential core assets
      const lower = safeName.toLowerCase();
      if (lower === 'mtsanimated.gif' || lower === 'logo.png' || lower.includes('default') || lower.includes('favicon')) {
        return res.status(400).json({ success: false, error: 'Cannot delete protected system asset' });
      }

      const candidateFilenames = new Set([
        safeName,
        rawBase,
        rawBase.replace(/\s+/g, '_'),
        rawBase.replace(/_/g, ' '),
        safeName.replace(/\s+/g, '_'),
        safeName.replace(/_/g, ' ')
      ]);

      let deletedDisk = false;
      if (fs.existsSync(vehicleImagesDir)) {
        for (const nameToTry of candidateFilenames) {
          const filePath = path.join(vehicleImagesDir, nameToTry);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              deletedDisk = true;
            } catch (e) {
              console.warn('[DeleteImage] Failed unlinking disk file:', nameToTry, e);
            }
          }
        }

        // Also check case-insensitive match on disk
        const normTarget = rawBase.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normTarget) {
          try {
            const diskFiles = fs.readdirSync(vehicleImagesDir);
            for (const file of diskFiles) {
              const normFile = file.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (normFile === normTarget) {
                const fullMatchPath = path.join(vehicleImagesDir, file);
                try {
                  fs.unlinkSync(fullMatchPath);
                  deletedDisk = true;
                } catch (e) {}
              }
            }
          } catch (readErr) {
            console.warn('[DeleteImage] Could not scan vehicleImagesDir:', readErr);
          }
        }
      }

      // Also remove backup copy from Firestore storedImages
      const db = getServerDb();
      if (db) {
        const docIdsToTry = new Set([
          safeName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase(),
          rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase(),
          rawBase.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
        ]);
        for (const docId of docIdsToTry) {
          try {
            await deleteDoc(doc(db, 'storedImages', docId));
          } catch (e) {
            // Document might not exist in storedImages, which is fine
          }
        }
      }

      console.log(`[Storage] Deleted old vehicle image: ${safeName} (disk: ${deletedDisk})`);
      return res.json({
        success: true,
        message: `Successfully deleted old image ${safeName}`,
        deletedDisk
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to delete image' });
    }
  };

  app.post('/api/delete-vehicle-image', requireStaff(['Admin', 'Staff']), handleDeleteVehicleImage);
  app.delete('/api/delete-vehicle-image', requireStaff(['Admin', 'Staff']), handleDeleteVehicleImage);

  /**
   * POST /api/upload-vehicle-images
   * Accepts an array of { name: string, dataUrl: string } and writes them safely to public/images/vehicles/
   * Also ensures persistence in Firestore storedImages collection.
   */
  app.post('/api/upload-vehicle-images', uploadLimiter, requireStaff(['Admin', 'Staff']), async (req, res) => {
    try {
      const { files } = req.body;
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files provided' });
      }

      if (files.length > 50) {
        return res.status(400).json({ success: false, error: 'Maximum 50 files per batch upload' });
      }

      if (!fs.existsSync(vehicleImagesDir)) {
        fs.mkdirSync(vehicleImagesDir, { recursive: true });
      }

      const savedFiles: { originalName?: string; filename: string; url: string; sizeBytes: number }[] = [];

      for (const item of files) {
        const { name, dataUrl } = item;
        if (!name || !dataUrl || typeof dataUrl !== 'string') continue;

        // Clean & sanitize filename against directory traversal
        const safeName = sanitizeFileName(name);
        const filePath = path.join(vehicleImagesDir, safeName);

        // Extract base64 content
        const base64Data = dataUrl.includes(';base64,')
          ? dataUrl.split(';base64,').pop()
          : dataUrl;

        if (base64Data) {
          const buffer = Buffer.from(base64Data, 'base64');
          if (buffer.length > 15 * 1024 * 1024) {
            continue; // Skip oversized items
          }
          fs.writeFileSync(filePath, buffer);
          savedFiles.push({
            originalName: name,
            filename: safeName,
            url: `/images/vehicles/${encodeURIComponent(safeName)}`,
            sizeBytes: buffer.length
          });
        }
      }

      // Persist backup copy to Firestore storedImages for resilience across container rebuilds
      const db = getServerDb();
      if (db && savedFiles.length > 0) {
        for (const item of files) {
          const { name, dataUrl } = item;
          if (!name || !dataUrl || typeof dataUrl !== 'string') continue;
          const safeName = sanitizeFileName(name);
          if (!savedFiles.some(saved => saved.filename === safeName)) continue;
          const safeDocId = safeName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
          try {
            await setDoc(doc(db, 'storedImages', safeDocId), {
              filename: safeName,
              dataUrl,
              ...(typeof item.targetItemId === 'string' ? { targetItemId: item.targetItemId.slice(0, 120) } : {}),
              ...(typeof item.targetItemName === 'string' ? { targetItemName: item.targetItemName.slice(0, 160) } : {}),
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (backupErr) {
            console.warn('[Upload] Server Firestore backup error for', safeName, backupErr);
          }
        }
      }

      return res.json({
        success: true,
        message: `Successfully stored ${savedFiles.length} vehicle image(s).`,
        savedCount: savedFiles.length,
        savedFiles
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Failed to upload images' });
    }
  });

  /**
   * GET /api/item-image/:targetId
   * Direct high-speed endpoint providing the exact current image for an item.
   * Resolves item from Firestore / memory, handles base64 dataUrls, local files, and remote URLs.
   * Perfect for Discord / Twitter embeds (like Jailbreak Wiki).
   */
  app.get('/api/item-image/:targetId', async (req, res) => {
    try {
      const rawTarget = req.params.targetId;
      if (!rawTarget) return res.status(400).send('Item ID required');

      // Strip .png, .webp, .jpg extensions if provided in the URL e.g. /api/item-image/m1a2.png
      const targetId = decodeURIComponent(rawTarget.replace(/\.(png|webp|jpe?g|gif)$/i, '')).trim().toLowerCase();
      const cleanTarget = targetId.replace(/[^a-z0-9]/g, '');

      let matched: any = null;
      const db = getServerDb();
      if (db) {
        try {
          const docSnap = await getDoc(doc(db, 'items', targetId));
          if (docSnap.exists()) {
            matched = docSnap.data();
          }
        } catch {}

        if (!matched) {
          try {
            const itemsSnap = await getDocs(collection(db, 'items'));
            for (const d of itemsSnap.docs) {
              const it = d.data();
              if (
                it.id?.toLowerCase() === targetId ||
                (it.acronym && it.acronym.toLowerCase() === targetId) ||
                (it.name && it.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget) ||
                it.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') === targetId ||
                it.name?.toLowerCase() === targetId
              ) {
                matched = it;
                break;
              }
            }
          } catch {}
        }
      }

      if (!matched) {
        matched = INITIAL_ITEMS.find(i =>
          i.id.toLowerCase() === targetId ||
          (i.acronym && i.acronym.toLowerCase() === targetId) ||
          (i.name && i.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget) ||
          i.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === targetId ||
          i.name.toLowerCase() === targetId
        );
      }

      // If item has a thumbnail:
      if (matched?.thumbnail && typeof matched.thumbnail === 'string') {
        const thumb = matched.thumbnail.trim();
        // 1. If base64 dataUrl: convert and stream binary
        if (thumb.startsWith('data:')) {
          const mimeMatch = thumb.match(/^data:([^;]+);base64,/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
          const base64Content = thumb.split(';base64,').pop();
          if (base64Content) {
            const buffer = Buffer.from(base64Content, 'base64');
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(buffer);
          }
        }
        // 2. If local vehicle path: e.g. /images/vehicles/filename.png
        if (thumb.includes('/images/vehicles/')) {
          const filename = path.basename(thumb.split('?')[0]);
          const diskPath = path.join(vehicleImagesDir, decodeURIComponent(filename));
          if (fs.existsSync(diskPath)) {
            const ext = path.extname(diskPath).toLowerCase();
            const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
            res.setHeader('Content-Type', mime);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return fs.createReadStream(diskPath).pipe(res);
          }
        }
      }

      // 3. Fallback: try matching vehicle image directly
      if (matched?.name) {
        const vehicleImgUrl = getVehicleImageUrl(matched.name, '');
        if (vehicleImgUrl) {
          const filename = path.basename(vehicleImgUrl.split('?')[0]);
          const diskPath = path.join(vehicleImagesDir, decodeURIComponent(filename));
          if (fs.existsSync(diskPath)) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return fs.createReadStream(diskPath).pipe(res);
          }
        }
      }

      // 4. Default fallback: animated MTS logo
      const defaultLogoPath = path.join(process.cwd(), 'public', 'mtsanimated.gif');
      if (fs.existsSync(defaultLogoPath)) {
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return fs.createReadStream(defaultLogoPath).pipe(res);
      }

      return res.status(404).send('Image not found');
    } catch (err: any) {
      return res.status(500).send('Error serving item image');
    }
  });

  /**
   * POST /api/verify-turnstile
   * Verifies Cloudflare Turnstile CAPTCHA response token
   */
  app.post('/api/verify-turnstile', createRateLimiter({ windowMs: 60000, max: 60, name: 'api-turnstile' }), async (req, res) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const { token } = req.body;
      if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
        return res.status(400).json({ success: false, verified: false, error: 'A valid Turnstile token is required.' });
      }

      const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
      if (!secretKey) {
        console.error('[Turnstile] CLOUDFLARE_TURNSTILE_SECRET_KEY is not configured.');
        return res.status(503).json({ success: false, verified: false, error: 'Cloudflare verification is not configured.' });
      }

      const formData = new URLSearchParams();
      formData.append('secret', secretKey);
      formData.append('response', token);
      if (req.ip) formData.append('remoteip', req.ip);

      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 8000);
      const cfResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        signal: controller.signal
      });

      if (!cfResponse.ok) {
        console.error(`[Turnstile] Siteverify returned HTTP ${cfResponse.status}.`);
        return res.status(502).json({ success: false, verified: false, error: 'Cloudflare verification is temporarily unavailable.' });
      }

      const outcome = await cfResponse.json();
      const errorCodes = Array.isArray(outcome['error-codes']) ? outcome['error-codes'] : [];
      if (errorCodes.includes('invalid-input-secret') || errorCodes.includes('missing-input-secret')) {
        console.error('[Turnstile] Cloudflare rejected the configured secret key.');
        return res.status(503).json({ success: false, verified: false, error: 'Cloudflare verification is misconfigured.' });
      }

      if (outcome.success !== true) {
        return res.status(400).json({ success: false, verified: false, error: 'Cloudflare could not verify this check. Please try again.' });
      }

      return res.json({ success: true, verified: true });
    } catch (err: any) {
      console.error('[Turnstile] Siteverify request failed:', err?.name === 'AbortError' ? 'request timed out' : 'network or response error');
      return res.status(502).json({ success: false, verified: false, error: 'Cloudflare verification is temporarily unavailable.' });
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  });

  // Permanent Discord Webhook URLs (Persisted in src/data/webhookConfig.json and baked into dist/server.cjs)
  const PERMANENT_CHANGELOG_WEBHOOK_URL =
    (defaultWebhookConfig as any)?.changelogWebhookUrl ||
    '';

  const PERMANENT_SUGGESTIONS_WEBHOOK_URL =
    (defaultWebhookConfig as any)?.suggestionsWebhookUrl ||
    '';

  // Runtime Discord webhook store (keeps URLs secret, loaded from env, file, Firestore, or permanent default)
  let runtimeDiscordWebhooks = {
    changelog:
      process.env.DISCORD_CHANGELOG_WEBHOOK_URL ||
      process.env.CHANGELOG_WEBHOOK_URL ||
      process.env.DISCORD_WEBHOOK_URL ||
      PERMANENT_CHANGELOG_WEBHOOK_URL,
    reports:
      process.env.DISCORD_REPORTS_WEBHOOK_URL ||
      process.env.DISCORD_SUGGESTIONS_WEBHOOK_URL ||
      process.env.SUGGESTIONS_WEBHOOK_URL ||
      process.env.REPORTS_WEBHOOK_URL ||
      process.env.DISCORD_WEBHOOK_URL ||
      PERMANENT_SUGGESTIONS_WEBHOOK_URL,
  };

  // Helper to get active webhook URL
  const getChangelogWebhookUrl = () => 
    runtimeDiscordWebhooks.changelog || 
    process.env.DISCORD_CHANGELOG_WEBHOOK_URL || 
    process.env.CHANGELOG_WEBHOOK_URL || 
    process.env.DISCORD_WEBHOOK_URL || 
    PERMANENT_CHANGELOG_WEBHOOK_URL;

  const getReportsWebhookUrl = () => 
    runtimeDiscordWebhooks.reports || 
    process.env.DISCORD_REPORTS_WEBHOOK_URL || 
    process.env.DISCORD_SUGGESTIONS_WEBHOOK_URL || 
    process.env.SUGGESTIONS_WEBHOOK_URL || 
    process.env.REPORTS_WEBHOOK_URL || 
    process.env.DISCORD_WEBHOOK_URL || 
    PERMANENT_SUGGESTIONS_WEBHOOK_URL;

  // Automatically hydrate webhook configuration from Firestore on startup
  async function hydrateWebhookConfig() {
    try {
      const db = getServerDb();
      if (!db) return;
      const docRef = doc(db, 'system', 'webhooks');
      const snapshot = await getDoc(docRef);
      const data = snapshot.exists() ? snapshot.data() : null;
      if (data) {
        if (data.changelogWebhookUrl && typeof data.changelogWebhookUrl === 'string' && data.changelogWebhookUrl.trim()) {
          runtimeDiscordWebhooks.changelog = data.changelogWebhookUrl.trim();
        } else {
          runtimeDiscordWebhooks.changelog = PERMANENT_CHANGELOG_WEBHOOK_URL;
        }
        if (data.suggestionsWebhookUrl && typeof data.suggestionsWebhookUrl === 'string' && data.suggestionsWebhookUrl.trim()) {
          runtimeDiscordWebhooks.reports = data.suggestionsWebhookUrl.trim();
        } else {
          runtimeDiscordWebhooks.reports = PERMANENT_SUGGESTIONS_WEBHOOK_URL;
        }
        console.log(`[Discord Webhooks Hydrated] Changelog configured: ${Boolean(getChangelogWebhookUrl())}, Suggestions configured: ${Boolean(getReportsWebhookUrl())}`);
      } else {
        // Seed Firestore system/webhooks with permanent webhooks so it is never empty on publish
        await setDoc(docRef, {
          changelogWebhookUrl: runtimeDiscordWebhooks.changelog,
          suggestionsWebhookUrl: runtimeDiscordWebhooks.reports,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('[Discord Webhooks Seeded] Permanent defaults saved to Firestore system/webhooks');
      }
    } catch (err) {
      console.warn('[Discord Webhook Hydration Warning]:', err);
    }
  }

  const webhookConfigReady = hydrateWebhookConfig();
  app.use('/api/webhooks', async (_req, _res, next) => {
    await webhookConfigReady;
    next();
  });

  /**
   * Derives the public domain base URL for external services (Discord, Twitter, etc.)
   */
  const getPublicDomainBase = (req?: express.Request): string => {
    const rawHost = req?.get('x-forwarded-host') || req?.get('host');
    if (rawHost && !rawHost.includes('localhost') && !rawHost.includes('127.0.0.1') && !rawHost.includes('0.0.0.0')) {
      const proto = (req?.headers['x-forwarded-proto'] as string) || req?.protocol || 'https';
      return `${proto}://${rawHost}`;
    }
    return 'https://mtsvalues.com';
  };

  /**
   * Resolves a public image URL for small embed pictures in Discord webhooks
   */
  const resolveDiscordEmbedThumbnail = (
    req: express.Request,
    opts: {
      thumbnail?: string;
      oldThumbnail?: string;
      itemId?: string;
      itemName?: string;
    }
  ): string => {
    const baseUrl = getPublicDomainBase(req);
    const candidate = (opts.thumbnail || opts.oldThumbnail || '').trim();

    // 1. Direct external public image URL (e.g. Roblox CDN, imgur, discord cdn, wikia)
    if (
      candidate &&
      (candidate.startsWith('http://') || candidate.startsWith('https://')) &&
      !candidate.includes('localhost') &&
      !candidate.includes('127.0.0.1') &&
      !candidate.includes('0.0.0.0')
    ) {
      return candidate;
    }

    // 2. Relative image path (e.g. /images/vehicles/Chinook%20CH-47.jpg)
    if (candidate && candidate.startsWith('/') && !candidate.startsWith('/data:')) {
      const cleanPath = candidate.startsWith('/') ? candidate : `/${candidate}`;
      const segments = cleanPath.split('/');
      const encodedPath = segments.map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
      return `${baseUrl}${encodedPath}`;
    }

    // 3. If candidate is base64 data URI OR empty, resolve via item ID or item name
    const targetSlug = (opts.itemId || opts.itemName || '').trim();
    if (targetSlug) {
      const cleanTarget = targetSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matched = INITIAL_ITEMS.find(i =>
        i.id.toLowerCase() === targetSlug.toLowerCase() ||
        (i.acronym && i.acronym.toLowerCase() === targetSlug.toLowerCase()) ||
        (i.name && i.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget) ||
        i.name.toLowerCase() === targetSlug.toLowerCase()
      );

      if (matched?.thumbnail && typeof matched.thumbnail === 'string') {
        const t = matched.thumbnail.trim();
        if (
          (t.startsWith('http://') || t.startsWith('https://')) &&
          !t.includes('localhost') &&
          !t.includes('127.0.0.1')
        ) {
          return t;
        }
        if (t.startsWith('/images/vehicles/') || t.startsWith('/api/')) {
          const segments = t.split('/');
          const encodedPath = segments.map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
          return `${baseUrl}${encodedPath}`;
        }
      }

      // If matched has a vehicle image in vehicleImageMap:
      if (matched?.name) {
        const vehicleImgUrl = getVehicleImageUrl(matched.name, '');
        if (vehicleImgUrl && vehicleImgUrl.startsWith('/images/vehicles/')) {
          const segments = vehicleImgUrl.split('/');
          const encodedPath = segments.map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
          return `${baseUrl}${encodedPath}`;
        }
      }

      // High-speed binary image endpoint that resolves base64 data URLs, vehicles, and disk images:
      const cleanId = encodeURIComponent(
        matched?.id ||
        targetSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
        targetSlug
      );
      return `${baseUrl}/api/item-image/${cleanId}`;
    }

    // 4. Default fallback: animated MTS emblem
    return `${baseUrl}/mtsanimated.gif`;
  };

  /**
   * Helper function to safely dispatch Discord webhooks with latency measurement
   */
  const sendDiscordWebhook = async (webhookUrl: string | undefined, payload: Record<string, any>) => {
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return { sent: false, latencyMs: 0, reason: 'No webhook URL configured.' };
    }

    const startTime = Date.now();
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MilitaryTycoonServices-Bot/1.0 (+https://militarytycoonservices.com)',
        },
        body: JSON.stringify(payload),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Discord Webhook] Delivery notice (${response.status}) in ${latencyMs}ms:`, errorText);
        return { sent: false, latencyMs, status: response.status, error: errorText };
      }

      console.log(`[Discord Webhook] Dispatched successfully in ${latencyMs}ms`);
      return { sent: true, latencyMs };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      console.warn(`[Discord Webhook] Network failure after ${latencyMs}ms:`, err?.message || err);
      return { sent: false, latencyMs, error: err?.message || 'Network error' };
    }
  };

  app.post('/api/reports/create', createRateLimiter({ windowMs: 300000, max: 8, name: 'api-report-create' }), async (req, res) => {
    const db = getServerDb();
    if (!db) return res.status(503).json({ success: false, error: 'Report storage is not configured. Please try again later.' });

    const token = typeof req.body?.turnstileToken === 'string' ? req.body.turnstileToken : '';
    const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
    if (!token || token.length > 2048) {
      return res.status(400).json({ success: false, error: 'Complete the security check and try again.' });
    }
    if (!secretKey) {
      console.error('[Turnstile] CLOUDFLARE_TURNSTILE_SECRET_KEY is not configured.');
      return res.status(503).json({ success: false, error: 'The security check is not configured. Please try again later.' });
    }

    try {
      const formData = new URLSearchParams({ secret: secretKey, response: token });
      if (req.ip) formData.set('remoteip', req.ip);
      const verifyResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        signal: AbortSignal.timeout(8000)
      });
      if (!verifyResponse.ok) return res.status(502).json({ success: false, error: 'The security check is temporarily unavailable.' });
      const verification = await verifyResponse.json();
      if (verification.success !== true) return res.status(400).json({ success: false, error: 'The security check expired. Complete it again and retry.' });

      const cleanText = (value: unknown, maxLength: number) =>
        typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength) : '';
      const itemId = cleanText(req.body.itemId, 120);
      const itemName = cleanText(req.body.itemName, 160);
      const reason = cleanText(req.body.reason, 2000);
      const proofLink = cleanText(req.body.proofLink, 1024);
      const suggestedValue = Number(req.body.suggestedValue);
      const currentValue = Number(req.body.currentValue);
      const numericDemand = (value: unknown) => value === undefined || value === null || value === ''
        ? undefined
        : Number(value);
      const suggestedDemand = numericDemand(req.body.suggestedDemand);
      const currentDemand = numericDemand(req.body.currentDemand);
      if (!itemId || !itemName || !reason || !proofLink || !Number.isFinite(suggestedValue) || suggestedValue < 0 || suggestedValue > 1e15) {
        return res.status(400).json({ success: false, error: 'Check the item, suggested value, reason, and evidence link.' });
      }
      try {
        const proofUrl = new URL(proofLink);
        if (!['http:', 'https:'].includes(proofUrl.protocol)) throw new Error('Invalid protocol');
      } catch {
        return res.status(400).json({ success: false, error: 'Enter a valid HTTP or HTTPS evidence link.' });
      }
      if ([currentDemand, suggestedDemand].some(value => value !== undefined && (!Number.isInteger(value) || value < 1 || value > 10))) {
        return res.status(400).json({ success: false, error: 'Demand values must be between 1 and 10.' });
      }

      const reportId = `report_${crypto.randomUUID()}`;
      const createdAt = new Date().toISOString();
      const report = {
        id: reportId,
        status: 'pending',
        createdAt,
        itemId,
        itemName,
        itemCategory: cleanText(req.body.itemCategory, 40),
        itemThumbnail: cleanText(req.body.itemThumbnail, 2048).startsWith('data:') ? '' : cleanText(req.body.itemThumbnail, 2048),
        ...(cleanText(req.body.starTier, 12) ? { starTier: cleanText(req.body.starTier, 12) } : {}),
        ...(cleanText(req.body.starLabel, 40) ? { starLabel: cleanText(req.body.starLabel, 40) } : {}),
        ...(Number.isFinite(currentValue) && currentValue >= 0 ? { currentValue } : {}),
        suggestedValue,
        ...(currentDemand !== undefined ? { currentDemand } : {}),
        ...(suggestedDemand !== undefined ? { suggestedDemand } : {}),
        ...(cleanText(req.body.currentTrend, 40) ? { currentTrend: cleanText(req.body.currentTrend, 40) } : {}),
        ...(cleanText(req.body.suggestedTrend, 40) ? { suggestedTrend: cleanText(req.body.suggestedTrend, 40) } : {}),
        playerUsername: cleanText(req.body.playerUsername, 80) || 'Anonymous Trader',
        ...(cleanText(req.body.discordTag, 80) ? { discordTag: cleanText(req.body.discordTag, 80) } : {}),
        reason,
        proofLink
      };
      await setDoc(doc(db, 'reports', reportId), report);

      const webhookUrl = getReportsWebhookUrl();
      const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
      if (report.starLabel || report.starTier) {
        fields.push({ name: '⭐ Star Tier', value: `**${report.starLabel || `${report.starTier}★`}**`, inline: true });
      }
      if (report.currentValue !== undefined) {
        fields.push({
          name: '💰 Valuation',
          value: `$${Number(report.currentValue).toLocaleString()} ➔ **$${suggestedValue.toLocaleString()}**`,
          inline: true
        });
      } else {
        fields.push({ name: '💰 Suggested Valuation', value: `**$${suggestedValue.toLocaleString()}**`, inline: true });
      }
      if (report.currentDemand !== undefined && report.suggestedDemand !== undefined && report.currentDemand !== report.suggestedDemand) {
        fields.push({ name: '🔥 Demand', value: `${report.currentDemand}/10 ➔ **${report.suggestedDemand}/10**`, inline: true });
      } else if (report.suggestedDemand !== undefined) {
        fields.push({ name: '🔥 Suggested Demand', value: `**${report.suggestedDemand}/10**`, inline: true });
      }
      if (report.currentTrend && report.suggestedTrend && report.currentTrend !== report.suggestedTrend) {
        fields.push({ name: '📈 Market Trend', value: `${report.currentTrend} ➔ **${report.suggestedTrend}**`, inline: true });
      } else if (report.suggestedTrend) {
        fields.push({ name: '📈 Suggested Trend', value: `**${report.suggestedTrend}**`, inline: true });
      }
      fields.push({ name: '👤 Submitted By', value: `\`${report.playerUsername}\``, inline: true });
      fields.push({ name: '📝 Reason / Market Justification', value: `>>> ${reason.slice(0, 1000)}`, inline: false });
      fields.push({ name: '🔗 Evidence / Proof', value: proofLink.slice(0, 500), inline: false });
      const reportThumbnail = resolveDiscordEmbedThumbnail(req, {
        thumbnail: report.itemThumbnail,
        itemId,
        itemName
      });
      await sendDiscordWebhook(webhookUrl, {
        username: 'MTS Community Suggestions',
        embeds: [{
          title: `💡 Value Suggestion: ${itemName}${report.starLabel ? ` (${report.starLabel})` : ''}`.slice(0, 256),
          color: 0xf97316,
          fields,
          ...(reportThumbnail ? { thumbnail: { url: reportThumbnail } } : {}),
          timestamp: createdAt,
          footer: { text: 'Military Tycoon Services • Community Suggestions Queue' }
        }]
      });

      return res.status(201).json({ success: true, reportId, createdAt });
    } catch (error) {
      console.error('[Report submission] Turnstile, Firestore, or notification step failed.');
      return res.status(500).json({ success: false, error: 'Could not submit the report. Please try again.' });
    }
  });

  /**
   * GET /api/webhooks/status
   * Returns current webhook configuration status WITHOUT exposing the secret webhook URLs
   */
  app.get('/api/webhooks/status', (req, res) => {
    const changelogUrl = getChangelogWebhookUrl();
    const reportsUrl = getReportsWebhookUrl();

    res.json({
      success: true,
      webhooks: {
        changelog: {
          configured: Boolean(changelogUrl),
          type: 'Public Changelog (Value, Demand, Trend, Star Tiers & Catalog changes)',
          delay: 'Real-time HTTP push (~100ms - 300ms network latency)',
        },
        reports: {
          configured: Boolean(reportsUrl),
          type: 'Community Suggestions (Current ➔ Suggested Values & Star Tiers)',
          delay: 'Real-time HTTP push (~100ms - 300ms network latency)',
        }
      },
      serverTime: new Date().toISOString()
    });
  });

  /**
   * POST /api/webhooks/save-config
   * Allows admins to update Discord webhook URLs. Stored securely in Firestore system/webhooks, local config file, and NEVER returned to the client.
   */
  app.post('/api/webhooks/save-config', webhookLimiter, requireStaff(['Admin']), async (req, res) => {
    try {
      const { changelogWebhookUrl, suggestionsWebhookUrl } = req.body || {};

      if (changelogWebhookUrl !== undefined && typeof changelogWebhookUrl === 'string' && changelogWebhookUrl.trim()) {
        runtimeDiscordWebhooks.changelog = changelogWebhookUrl.trim();
      }

      if (suggestionsWebhookUrl !== undefined && typeof suggestionsWebhookUrl === 'string' && suggestionsWebhookUrl.trim()) {
        runtimeDiscordWebhooks.reports = suggestionsWebhookUrl.trim();
      }

      const activeChangelog = getChangelogWebhookUrl();
      const activeReports = getReportsWebhookUrl();

      // Persist to local JSON file for build-time and deployment permanence
      try {
        const configPath = path.join(process.cwd(), 'src', 'data', 'webhookConfig.json');
        fs.writeFileSync(configPath, JSON.stringify({
          changelogWebhookUrl: activeChangelog,
          suggestionsWebhookUrl: activeReports,
          updatedAt: new Date().toISOString()
        }, null, 2), 'utf8');
      } catch (fileErr) {
        // Read-only filesystem in some deployment containers is non-blocking
      }

      // Persist to Firestore system/webhooks
      try {
        const db = getServerDb();
        if (db) {
          await setDoc(doc(db, 'system', 'webhooks'), {
            changelogWebhookUrl: activeChangelog,
            suggestionsWebhookUrl: activeReports,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (dbErr) {
        console.warn('[Webhook Firestore Save Warning]:', dbErr);
      }

      console.log(`[Discord Webhooks Config Updated] Changelog: ${Boolean(activeChangelog)}, Suggestions: ${Boolean(activeReports)}`);

      return res.status(200).json({
        success: true,
        message: 'Discord webhook configuration saved securely. Webhook URLs are masked, protected, and persisted across builds.',
        changelogConfigured: Boolean(activeChangelog),
        reportsConfigured: Boolean(activeReports)
      });
    } catch (err: any) {
      console.error('[API /api/webhooks/save-config] Error:', err);
      return res.status(500).json({ success: false, error: 'Failed to update webhook configuration' });
    }
  });

  /**
   * POST /api/webhooks/test
   * Dispatches a test embed to verify Discord webhook connectivity and report precise round-trip latency
   */
  app.post('/api/webhooks/test', webhookLimiter, requireStaff(['Admin']), async (req, res) => {
    try {
      const { type = 'changelog', tester = 'Admin' } = req.body;
      const isChangelog = type === 'changelog';
      const webhookUrl = isChangelog ? getChangelogWebhookUrl() : getReportsWebhookUrl();

      if (!webhookUrl) {
        return res.status(400).json({
          success: false,
          configured: false,
          message: `No ${isChangelog ? 'Changelog' : 'Suggestion'} Discord webhook URL has been configured yet. Enter a valid Discord webhook link above.`
        });
      }

      const testEmbed = {
        title: isChangelog ? '📢 Military Tycoon Services • Changelog Feed Test' : '💡 Military Tycoon Services • Suggestions Feed Test',
        color: isChangelog ? 0x10b981 : 0xf97316,
        description: `This is an automated connectivity and latency test dispatched by **${tester}**.`,
        thumbnail: {
          url: `${getPublicDomainBase(req)}/mtsanimated.gif`
        },
        fields: [
          {
            name: '⚡ Integration Status',
            value: '✅ Webhook endpoint is actively connected and operational.',
            inline: false,
          },
          {
            name: '🎯 Channel Target',
            value: isChangelog ? '`Public Changelog Feed`' : '`Public Suggestions Queue`',
            inline: true,
          },
          {
            name: '🔒 Privacy Standard',
            value: '`Public-Only Payload (URLs Masked)`',
            inline: true,
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Military Tycoon Services • Webhook Verification',
        },
      };

      const result = await sendDiscordWebhook(webhookUrl, {
        username: isChangelog ? 'MTS Public Changelog' : 'MTS Community Suggestions',
        embeds: [testEmbed],
      });

      return res.status(200).json({
        success: result.sent,
        latencyMs: result.latencyMs,
        configured: true,
        message: result.sent 
          ? `Webhook delivered to Discord successfully in ${result.latencyMs}ms!`
          : `Failed to deliver: ${result.error || 'Discord returned an error'}`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Server error' });
    }
  });

  /**
   * POST /api/webhooks/changelog
   * Dispatches public catalog updates, price modifications, demand shifts, and star tier changes.
   * STRICT REQUIREMENT: Only show what got changed in value, demand, trend, star tiers, and nothing private.
   */
  app.post('/api/webhooks/changelog', webhookLimiter, requireStaff(['Admin', 'Staff', 'Analyst', 'Consultant']), async (req, res) => {
    try {
      const {
        action = 'MANUAL_EDIT',
        itemName = 'Market Item',
        itemId,
        oldValue,
        newValue,
        oldDemand,
        newDemand,
        oldTrend,
        newTrend,
        oldName,
        newName,
        thumbnail,
        oldThumbnail,
        category,
        rarity,
        starChanges,
        isNewItem = false,
        timestamp = new Date().toISOString()
      } = req.body;

      // STRICT CHECK: Exclude internal Site Backups, Disaster Recovery, and explicitly skipped items from public Discord changelog
      const targetName = (newName || itemName || '').trim().toLowerCase();
      if (
        req.body.skipWebhook ||
        targetName === 'site backup' ||
        targetName.includes('site backup') ||
        targetName.includes('site recovery') ||
        targetName === 'staff auth' ||
        targetName.includes('data export') ||
        targetName === 'demand automation' ||
        targetName.includes('auto-sort') ||
        action === 'DATA_EXPORT' ||
        action === 'SYSTEM_RESET'
      ) {
        return res.json({
          success: true,
          skipped: true,
          message: 'Internal administrative activity / site backup hidden from public changelog webhook.'
        });
      }

      const webhookUrl = getChangelogWebhookUrl();

      // Value Formatter for Discord
      const formatDiscordGemValue = (val: number | string | undefined | null): string => {
        if (val === undefined || val === null || val === '') return '💎 0';
        const num = Number(val);
        if (isNaN(num)) return String(val);
        if (num === 1) return '💎 1 Gem';
        return `💎 ${num.toLocaleString()} Gems`;
      };

      const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

      // 1. Name Change (if renamed)
      if (oldName && newName && oldName !== newName) {
        fields.push({
          name: '🏷️ Item Renamed',
          value: `\`${oldName}\` ➔ **\`${newName}\`**`,
          inline: false,
        });
      }

      // 2. Base Valuation / Value Change (ONLY IF CHANGED)
      const hasBaseValueChange = oldValue !== undefined && newValue !== undefined && Number(oldValue) !== Number(newValue);
      if (hasBaseValueChange) {
        fields.push({
          name: '💰 Base Value',
          value: `${formatDiscordGemValue(oldValue)} ➔ **${formatDiscordGemValue(newValue)}**`,
          inline: true,
        });
      } else if (isNewItem && newValue !== undefined) {
        fields.push({
          name: '💰 Initial Value',
          value: `**${formatDiscordGemValue(newValue)}**`,
          inline: true,
        });
      }

      // 3. Base Demand Rating Change (ONLY IF CHANGED)
      const hasBaseDemandChange = oldDemand !== undefined && newDemand !== undefined && Number(oldDemand) !== Number(newDemand);
      if (hasBaseDemandChange) {
        fields.push({
          name: '🔥 Base Demand',
          value: `${oldDemand}/10 ➔ **${newDemand}/10**`,
          inline: true,
        });
      } else if (isNewItem && newDemand !== undefined) {
        fields.push({
          name: '🔥 Demand',
          value: `**${newDemand}/10**`,
          inline: true,
        });
      }

      // 4. Base Trend Change (ONLY IF CHANGED)
      const hasBaseTrendChange = Boolean(oldTrend && newTrend && oldTrend !== newTrend);
      if (hasBaseTrendChange) {
        fields.push({
          name: '📈 Market Trend',
          value: `${oldTrend} ➔ **${newTrend}**`,
          inline: true,
        });
      } else if (isNewItem && newTrend) {
        fields.push({
          name: '📈 Market Trend',
          value: `**${newTrend}**`,
          inline: true,
        });
      }

      // 5. Star Tier Changes (ONLY IF CHANGED)
      const starTiersModified: string[] = [];
      let anyStarValueDropped = false;
      let anyStarValueRisen = false;

      if (starChanges && Array.isArray(starChanges) && starChanges.length > 0) {
        for (const sc of starChanges) {
          const tierLabel = sc.tierLabel || (sc.tierId === 'fresh' ? 'Fresh' : `${sc.tierId}★`);
          let tierChanged = false;

          // Star Tier Value Change
          if (sc.oldValue !== undefined && sc.newValue !== undefined && Number(sc.oldValue) !== Number(sc.newValue)) {
            fields.push({
              name: `⭐ ${tierLabel} Value`,
              value: `${formatDiscordGemValue(sc.oldValue)} ➔ **${formatDiscordGemValue(sc.newValue)}**`,
              inline: true,
            });
            tierChanged = true;
            if (Number(sc.newValue) < Number(sc.oldValue)) anyStarValueDropped = true;
            if (Number(sc.newValue) > Number(sc.oldValue)) anyStarValueRisen = true;
          }

          // Star Tier Demand Change
          if (sc.oldDemand !== undefined && sc.newDemand !== undefined && Number(sc.oldDemand) !== Number(sc.newDemand)) {
            fields.push({
              name: `🔥 ${tierLabel} Demand`,
              value: `${sc.oldDemand}/10 ➔ **${sc.newDemand}/10**`,
              inline: true,
            });
            tierChanged = true;
          }

          // Star Tier Trend Change
          if (sc.oldTrend && sc.newTrend && sc.oldTrend !== sc.newTrend) {
            fields.push({
              name: `📈 ${tierLabel} Trend`,
              value: `${sc.oldTrend} ➔ **${sc.newTrend}**`,
              inline: true,
            });
            tierChanged = true;
          }

          if (tierChanged) {
            starTiersModified.push(tierLabel);
          }
        }
      }

      // 6. For new items, show category & rarity
      if (isNewItem && (category || rarity)) {
        fields.push({
          name: '🎖️ Category & Rarity',
          value: `\`${category || 'General'}\` • \`${rarity || 'Common'}\``,
          inline: true,
        });
      }

      // Strict Public Changelog Check: If no public value/demand/trend/star field changed, skip webhook
      if (fields.length === 0 && action !== 'ITEM_DELETED' && !isNewItem) {
        return res.json({
          success: true,
          skipped: true,
          message: 'No public value, demand, trend, or star tier changes detected. Public webhook skipped.'
        });
      }

      // Determine Embed Title
      const displayName = newName || itemName;
      let embedTitle = `📝 Value Update: ${displayName}`;

      const onlyStarsChanged = !hasBaseValueChange && !hasBaseDemandChange && !hasBaseTrendChange && starTiersModified.length > 0;
      if (onlyStarsChanged) {
        if (starTiersModified.length === 1) {
          embedTitle = `⭐ Star Value Update: ${displayName} (${starTiersModified[0]})`;
        } else {
          embedTitle = `⭐ Star Tier Update: ${displayName} (${starTiersModified.join(', ')})`;
        }
      } else if (action === 'ITEM_ADDED' || isNewItem) {
        embedTitle = `✨ New Item Added: ${displayName}`;
      } else if (action === 'ITEM_DELETED') {
        embedTitle = `🗑️ Item Removed: ${displayName}`;
        fields.length = 0;
        fields.push({
          name: 'Status',
          value: 'Item listing was archived or removed from active catalog.',
          inline: false
        });
      }

      // Determine Embed Color
      let embedColor = 0x10b981; // Emerald/Green default

      if (action === 'ITEM_ADDED' || isNewItem) {
        embedColor = 0x22c55e; // Bright Green
      } else if (action === 'ITEM_DELETED') {
        embedColor = 0xef4444; // Red
      } else if (hasBaseValueChange) {
        if (Number(newValue) > Number(oldValue)) {
          embedColor = 0x22c55e; // Green for rise
        } else if (Number(newValue) < Number(oldValue)) {
          embedColor = 0xef4444; // Red for drop
        }
      } else if (anyStarValueDropped) {
        embedColor = 0xef4444; // Red for star tier value drop
      } else if (anyStarValueRisen) {
        embedColor = 0x22c55e; // Green for star tier value rise
      }

      const embed: Record<string, any> = {
        title: embedTitle,
        color: embedColor,
        fields,
        timestamp: new Date(timestamp).toISOString(),
        footer: {
          text: 'Military Tycoon Services • Public Changelog',
        },
      };

      // Attach small embed picture thumbnail of the current item
      const itemPicUrl = resolveDiscordEmbedThumbnail(req, {
        thumbnail,
        oldThumbnail,
        itemId,
        itemName: displayName,
      });
      if (itemPicUrl) {
        embed.thumbnail = { url: itemPicUrl };
      }

      const result = await sendDiscordWebhook(webhookUrl, {
        username: 'MTS Public Changelog',
        embeds: [embed],
      });

      return res.status(200).json({
        success: true,
        dispatched: result.sent,
        latencyMs: result.latencyMs,
        message: result.sent 
          ? `Changelog webhook dispatched to Discord (${result.latencyMs}ms).` 
          : 'Changelog recorded locally.',
      });
    } catch (err: any) {
      console.error('[API /api/webhooks/changelog] Error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Server error' });
    }
  });

  /**
   * POST /api/webhooks/reports
   * Dispatches public community suggestions and star value adjustments.
   * Format: Shows current value --> suggest value, star tier, demand, trend, submitter, and rationale.
   */
  app.post('/api/webhooks/reports', webhookLimiter, requireStaff(['Admin', 'Staff']), async (req, res) => {
    try {
      const {
        reportId,
        itemId,
        itemName,
        starTier,
        starLabel,
        currentValue,
        suggestedValue,
        currentDemand,
        suggestedDemand,
        currentTrend,
        suggestedTrend,
        reason,
        proofLinks,
        username,
        timestamp = new Date().toISOString()
      } = req.body;

      const webhookUrl = getReportsWebhookUrl();

      const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

      // 1. Star Tier info (if present)
      if (starLabel || starTier) {
        fields.push({
          name: '⭐ Star Tier',
          value: `**${starLabel || `${starTier}★`}**`,
          inline: true,
        });
      }

      // 2. Valuation: current value --> suggest value
      if (currentValue !== undefined && suggestedValue !== undefined) {
        fields.push({
          name: '💰 Valuation',
          value: `$${Number(currentValue).toLocaleString()} ➔ **$${Number(suggestedValue).toLocaleString()}**`,
          inline: true,
        });
      } else if (suggestedValue !== undefined) {
        fields.push({
          name: '💰 Suggested Valuation',
          value: `**$${Number(suggestedValue).toLocaleString()}**`,
          inline: true,
        });
      }

      // 3. Demand: current demand --> suggest demand
      if (currentDemand !== undefined && suggestedDemand !== undefined && Number(currentDemand) !== Number(suggestedDemand)) {
        fields.push({
          name: '🔥 Demand',
          value: `${currentDemand}/10 ➔ **${suggestedDemand}/10**`,
          inline: true,
        });
      } else if (suggestedDemand !== undefined) {
        fields.push({
          name: '🔥 Suggested Demand',
          value: `**${suggestedDemand}/10**`,
          inline: true,
        });
      }

      // 4. Trend: current trend --> suggest trend
      if (currentTrend && suggestedTrend && currentTrend !== suggestedTrend) {
        fields.push({
          name: '📈 Market Trend',
          value: `${currentTrend} ➔ **${suggestedTrend}**`,
          inline: true,
        });
      } else if (suggestedTrend) {
        fields.push({
          name: '📈 Suggested Trend',
          value: `**${suggestedTrend}**`,
          inline: true,
        });
      }

      // 5. Submitted By (Public username only)
      fields.push({
        name: '👤 Submitted By',
        value: `\`${username || 'Anonymous Trader'}\``,
        inline: true,
      });

      // 6. Reason / Market Rationale
      if (reason && String(reason).trim()) {
        fields.push({
          name: '📝 Reason / Market Justification',
          value: `>>> ${String(reason).substring(0, 1000)}`,
          inline: false,
        });
      }

      // 7. Evidence & Proof Links
      if (proofLinks && proofLinks.length > 0) {
        const validLinks = Array.isArray(proofLinks) ? proofLinks.filter(Boolean) : [proofLinks];
        if (validLinks.length > 0) {
          fields.push({
            name: '🔗 Evidence / Proof',
            value: validLinks.join('\n').substring(0, 500),
            inline: false,
          });
        }
      }

      const embedTitle = `💡 Value Suggestion: ${itemName || 'Military Item'}${starLabel ? ` (${starLabel})` : ''}`;

      const embed: Record<string, any> = {
        title: embedTitle,
        color: 0xf97316, // Vibrant Orange
        description: `A community trader submitted a value adjustment for **${itemName}**${starLabel ? ` at **${starLabel}**` : ''}.`,
        fields,
        timestamp: new Date(timestamp).toISOString(),
        footer: {
          text: 'Military Tycoon Services • Community Suggestions Queue',
        },
      };

      // Attach small embed picture thumbnail of the current item
      const reportPicUrl = resolveDiscordEmbedThumbnail(req, {
        thumbnail: req.body.itemThumbnail || req.body.thumbnail,
        itemId,
        itemName,
      });
      if (reportPicUrl) {
        embed.thumbnail = { url: reportPicUrl };
      }

      const result = await sendDiscordWebhook(webhookUrl, {
        username: 'MTS Community Suggestions',
        embeds: [embed],
      });

      return res.status(200).json({
        success: true,
        dispatched: result.sent,
        latencyMs: result.latencyMs,
        message: result.sent 
          ? `Suggestion webhook dispatched to Discord (${result.latencyMs}ms).` 
          : 'Suggestion saved locally.',
      });
    } catch (err: any) {
      console.error('[API /api/webhooks/reports] Error:', err);
      return res.status(500).json({ success: false, error: 'Server error processing suggestion webhook' });
    }
  });

  // Global Express error handler to prevent internal trace leakage
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Express Unhandled Error]:', err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred.'
    });
  });

  // Serve static assets from public/ (including animated icons, favicon, etc.)
  app.use(express.static(path.join(process.cwd(), 'public'), {
    maxAge: '1d'
  }));

  // Explicit route for animated MTS logo gif
  app.get('/mtsanimated.gif', (req, res) => {
    const filePath = path.join(process.cwd(), 'public', 'mtsanimated.gif');
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(filePath);
  });

  // Social Crawler / Discord Embed Interceptor:
  // When Discordbot, Twitterbot, Telegram, etc. requests any page (such as / or /item/:id),
  // return server-rendered HTML with the animated MTS logo or vehicle icon as a large image embed.
  const SOCIAL_BOT_REGEX = /discordbot|twitterbot|facebookexternalhit|telegrambot|slackbot|whatsapp|linkedinbot|embedly|quora link preview|pinterest|vkshare|w3c_validator/i;

  app.get('*', async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    if (!SOCIAL_BOT_REGEX.test(userAgent)) {
      return next();
    }

    const host = req.get('host') || 'localhost:3000';
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    let fullUrl = `${proto}://${host}${req.originalUrl}`;
    
    // Default site metadata with user-provided animated MTS logo
    const defaultAnimatedLogo = `${proto}://${host}/mtsanimated.gif`;
    let title = 'MTS | Military Tycoon Services Value List';
    const siteName = 'Military Tycoon Services';
    let description = 'Roblox Military Tycoon value list with current item values, demand ratings, value trends, and a built-in trade calculator. Updated frequently for accuracy.';
    let embedImageUrl = defaultAnimatedLogo;
    let imageType = 'image/gif';
    let imageWidth = 500;
    let imageHeight = 500;
    let imageAlt = 'Military Tycoon Services Animated Logo';
    let themeColor = '#f97316';

    // If requesting an individual vehicle/item page, render the latest vehicle model/image and stats:
    let targetId = '';
    if (req.path.startsWith('/item/')) {
      targetId = decodeURIComponent(req.path.replace(/^\/item\//, '').split('/')[0]).trim();
    } else if (req.query.item && typeof req.query.item === 'string') {
      targetId = req.query.item.trim();
    }

    if (targetId) {
      const lowerTarget = targetId.toLowerCase();
      const cleanTarget = lowerTarget.replace(/[^a-z0-9]/g, '');
      let matched: any = null;

      // Check Firestore FIRST if database is initialized for newest live edits
      if (serverDbInstance) {
        try {
          const docSnap = await getDoc(doc(serverDbInstance, 'items', targetId));
          if (docSnap.exists()) {
            matched = docSnap.data();
          }
        } catch {
          // fallback
        }

        // If not matched by doc ID, search Firestore items collection by name or slug
        if (!matched) {
          try {
            const itemsSnap = await getDocs(collection(serverDbInstance, 'items'));
            for (const d of itemsSnap.docs) {
              const it = d.data();
              if (
                it.id?.toLowerCase() === lowerTarget ||
                (it.acronym && it.acronym.toLowerCase() === lowerTarget) ||
                (it.name && it.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget) ||
                (it.name && it.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === lowerTarget) ||
                it.name?.toLowerCase() === lowerTarget
              ) {
                matched = it;
                break;
              }
            }
          } catch {}
        }
      }

      if (!matched) {
        matched = INITIAL_ITEMS.find(i =>
          i.id.toLowerCase() === lowerTarget ||
          (i.acronym && i.acronym.toLowerCase() === lowerTarget) ||
          (i.name && i.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget) ||
          (i.name && i.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === lowerTarget) ||
          i.name?.toLowerCase() === lowerTarget
        );
      }

      if (matched) {
        title = `${matched.name} | Military Tycoon Services`;
        const valFormatted = typeof matched.value === 'number' ? `$${matched.value.toLocaleString()}` : matched.value;
        description = `Market Value: ${valFormatted} • Demand: ${matched.demand}/10 • Trend: ${matched.trend} • Rarity: ${matched.rarity}\nLive Roblox Military Tycoon item trading stats, star tier multipliers, and demand calculator.`;
        
        switch (matched.rarity) {
          case 'Limited Edition': themeColor = '#f43f5e'; break;
          case 'Exotic': themeColor = '#ef4444'; break;
          case 'Legendary': themeColor = '#eab308'; break;
          case 'Epic': themeColor = '#a855f7'; break;
          case 'Rare': themeColor = '#38bdf8'; break;
          case 'Common': themeColor = '#94a3b8'; break;
          default: themeColor = '#f97316'; break;
        }

        const hostUrl = `${proto}://${host}`;
        const cacheBuster = matched.lastUpdated ? new Date(matched.lastUpdated).getTime() : Date.now();
        
        // Direct image embed URL using dedicated endpoint (like Jailbreak Wiki)
        embedImageUrl = `${hostUrl}/api/item-image/${encodeURIComponent(matched.id)}.png?v=${cacheBuster}`;
        imageType = 'image/png';
        imageWidth = 1200;
        imageHeight = 675;
        imageAlt = `${matched.name} • Military Tycoon Services`;
        
        // Canonical item URL with clean slug
        const matchedSlug = matched.name ? matched.name.toLowerCase().replace(/[^a-z0-9]/g, '') : matched.id;
        fullUrl = `${hostUrl}/item/${encodeURIComponent(matchedSlug || matched.id)}`;
      }
    }

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="theme-color" content="${themeColor}" />

  <!-- Favicon & Icons -->
  <link rel="icon" type="image/gif" href="${defaultAnimatedLogo}" />
  <link rel="shortcut icon" type="image/gif" href="${defaultAnimatedLogo}" />
  <link rel="canonical" href="${escapeHtml(fullUrl)}" />

  <!-- Open Graph / Discord Embed -->
  <meta property="og:site_name" content="${escapeHtml(siteName)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(fullUrl)}" />
  <meta property="og:image" content="${escapeHtml(embedImageUrl)}" />
  <meta property="og:image:url" content="${escapeHtml(embedImageUrl)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(embedImageUrl)}" />
  <meta property="og:image:type" content="${imageType}" />
  <meta property="og:image:width" content="${imageWidth}" />
  <meta property="og:image:height" content="${imageHeight}" />
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />

  <!-- Twitter Card / Large Image Card Embed -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(embedImageUrl)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <img src="${escapeHtml(embedImageUrl)}" alt="${escapeHtml(imageAlt)}" />
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.VERCEL) return app;

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`MTS Server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('[Express Listen Error]:', err);
    process.exit(1);
  });

  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return app;
}

process.on('unhandledRejection', (reason, promise) => {
  console.warn('[Unhandled Rejection at]:', promise, 'reason:', reason);
});

if (!process.env.VERCEL) createApp().catch((err) => {
  console.error('[MTS Server Fatal Error]:', err);
  process.exit(1);
});
