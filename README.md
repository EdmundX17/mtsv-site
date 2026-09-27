# MTSV site on Vercel

This is a Vite frontend with an Express API exposed through `api/index.ts`. Set the Vercel project root to this directory (`mtsv-site`), install with `npm install`, and use the included `vercel.json` build and route settings.

## Configuration

Set the existing Firebase project permissions and these Vercel environment variables as needed:

- `DISCORD_CHANGELOG_WEBHOOK_URL` and `DISCORD_REPORTS_WEBHOOK_URL` for Discord notifications.
- `CLOUDFLARE_TURNSTILE_SECRET_KEY` and `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY` for Turnstile.
- `GEMINI_API_KEY` if enabling any Gemini-backed feature.

Both Turnstile keys must belong to the same Cloudflare widget. The site key is public and is embedded during the Vercel build; the secret key stays server-side. Add the site key to Vercel for every environment that should show Turnstile, then redeploy after changing it.

The client and server use `firebase-applet-config.json` to connect to the existing Firebase project and its named Firestore database. Hosting the site on Vercel does not move that database. If you later retire the Firebase project, migrate its data first and then update the config and server credentials.

## Staff username/password setup

Staff enter a username and password on the site. The server checks a salted `scrypt` password hash in the private `staffCredentials` collection, validates Turnstile, and issues a short-lived Firebase custom sign-in token. Firebase Authentication then supplies a signed identity for Firestore rules; staff do not need Firebase Console email accounts. Roles remain in `staffRoles/{firebaseUid}`. Existing role labels and legacy profiles can be linked to new usernames by an Admin. The first Admin roster load removes old plaintext password fields from `system/staffRoster`; older local rosters are imported without passwords.

Complete these steps for deployment:

1. In Firebase **Project settings → Service accounts**, generate a Firebase Admin SDK key. Keep the downloaded JSON private.
2. In Vercel project **Settings → Environment Variables**, set server-only `FIREBASE_SERVICE_ACCOUNT_JSON` to the complete JSON. Set `STAFF_BOOTSTRAP_USERNAME` (3–40 lowercase letters, digits, dots, dashes, or underscores; starts with a letter) and a unique `STAFF_BOOTSTRAP_PASSWORD` of at least 16 characters. Do not add a `VITE_` prefix. Set the Turnstile site and secret keys too.
3. Deploy the app. In Firebase Console, open this project's **Firestore Database → Rules**, replace the rules with [`firestore.rules`](./firestore.rules), and click **Publish**. This closes staff access through older email sign-ins. The checked-in file alone does not publish the rules.
4. Open the site Staff panel, complete Turnstile, and sign in with the bootstrap username and password. The server creates the first Admin account once. Remove the two `STAFF_BOOTSTRAP_*` variables from Vercel after that first successful sign-in and redeploy; the saved salted hash continues to work.
5. In Staff Management, create new usernames or select a legacy profile to preserve its role. Copy each one-time temporary password and share it privately. Ask each staff member to use **Change Password** after signing in. Do not reuse old local passwords.
6. Verify each staff member's role and test the features available to that role. Old email/password and Google sign-ins cannot use the staff APIs or Firestore rules after the new rules are published.

The Admin SDK credential is required for staff account administration, private image storage, sanitized roster migration, and CAPTCHA-protected public report submissions. Without it, the site can load, but those server operations return a setup error. Firebase Admin access bypasses Firestore rules, so only trusted server code should use this credential.

Run `npm run lint` and `npm run build` before deploying. Check `/api/health`, image upload and retrieval, translation, authentication, and the webhook test on the preview deployment.

## Storage limits

Vercel functions have ephemeral disk. The uploader resizes vehicle thumbnails to 512×512 and stores them in the existing Firestore `storedImages` collection; local disk is only a cache. Original, full-resolution files are not retained. Firestore document and Vercel request size limits still apply to unusually large optimized images or batches; use dedicated object storage if full-resolution uploads become a requirement.
