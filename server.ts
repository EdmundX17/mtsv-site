import express from 'express';
import path from 'path';
import os from 'os';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore/lite';
import { INITIAL_ITEMS } from './src/data/initialItems';
import { getVehicleImageUrl } from './src/data/vehicleImageMap';
import defaultWebhookConfig from './src/data/webhookConfig.json';

dotenv.config();

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
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

  // Embedded Firebase configuration backup ensuring Firestore always connects in production/publish containers
  const EMBEDDED_FIREBASE_CONFIG = {
    projectId: "gen-lang-client-0834691577",
    appId: "1:903099188173:web:4ebd4fc284365bc7c27a84",
    apiKey: "AIzaSyBD41wFDkXOz2OcF3gKLBWq9vh8Ns5XtDg",
    authDomain: "gen-lang-client-0834691577.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-militarytycoonva-d16f20ea-1387-4fd1-8489-0514fef25c1d",
    storageBucket: "gen-lang-client-0834691577.firebasestorage.app",
    messagingSenderId: "903099188173",
  };

  // Firebase Firestore instance helper for persistent image caching and on-demand recovery
  let serverDbInstance: any = null;
  function getServerDb() {
    if (serverDbInstance) return serverDbInstance;
    try {
      let cfg: any = null;
      const configCandidates = [
        path.join(process.cwd(), 'firebase-applet-config.json'),
        path.join(process.cwd(), 'dist', 'firebase-applet-config.json')
      ];
      for (const p of configCandidates) {
        if (fs.existsSync(p)) {
          try {
            cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (cfg?.projectId) break;
          } catch {}
        }
      }
      if (!cfg || !cfg.projectId) {
        cfg = EMBEDDED_FIREBASE_CONFIG;
      }
      const firebaseApp = getApps().length === 0 ? initializeApp(cfg) : getApp();
      serverDbInstance = getFirestore(firebaseApp, cfg.firestoreDatabaseId || undefined);
      return serverDbInstance;
    } catch (e) {
      console.warn('[Firebase Server Init Warning]:', e);
    }
    return null;
  }

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

  // Apply general API rate limiter
  app.use('/api', apiLimiter);

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
  app.post('/api/cache-image', uploadLimiter, async (req, res) => {
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

  app.post('/api/delete-vehicle-image', handleDeleteVehicleImage);
  app.delete('/api/delete-vehicle-image', handleDeleteVehicleImage);

  /**
   * POST /api/upload-vehicle-images
   * Accepts an array of { name: string, dataUrl: string } and writes them safely to public/images/vehicles/
   * Also ensures persistence in Firestore storedImages collection.
   */
  app.post('/api/upload-vehicle-images', uploadLimiter, async (req, res) => {
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
          const safeDocId = safeName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
          try {
            await setDoc(doc(db, 'storedImages', safeDocId), {
              filename: safeName,
              dataUrl,
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
      const cfg = EMBEDDED_FIREBASE_CONFIG;
      const url = new URL(`https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents/system/webhooks`);
      url.searchParams.set('key', cfg.apiKey);
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok && response.status !== 404) {
        throw new Error(`Firestore webhook read failed (${response.status})`);
      }
      const payload = response.ok ? await response.json() : null;
      const data = payload ? {
        changelogWebhookUrl: payload.fields?.changelogWebhookUrl?.stringValue,
        suggestionsWebhookUrl: payload.fields?.suggestionsWebhookUrl?.stringValue
      } : null;
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
  app.post('/api/webhooks/save-config', webhookLimiter, async (req, res) => {
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
  app.post('/api/webhooks/test', webhookLimiter, async (req, res) => {
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
  app.post('/api/webhooks/changelog', webhookLimiter, async (req, res) => {
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
  app.post('/api/webhooks/reports', webhookLimiter, async (req, res) => {
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
