# MTSV site on Vercel

This is a Vite frontend with an Express API exposed through `api/index.ts`. Set the Vercel project root to this directory (`mtsv-site`), install with `npm install`, and use the included `vercel.json` build and route settings.

## Configuration

Set the existing Firebase project permissions and these Vercel environment variables as needed:

- `DISCORD_CHANGELOG_WEBHOOK_URL` and `DISCORD_REPORTS_WEBHOOK_URL` for Discord notifications.
- `CLOUDFLARE_TURNSTILE_SECRET_KEY` and `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY` for Turnstile.
- `GEMINI_API_KEY` if enabling any Gemini-backed feature.

Both Turnstile keys must belong to the same Cloudflare widget. The site key is public and is embedded during the Vercel build; the secret key stays server-side. Add the site key to Vercel for every environment that should show Turnstile, then redeploy after changing it.

The client currently uses `firebase-applet-config.json` and the existing AI Studio Firebase project. Migrate that Firebase database and update the config if the AI Studio project will be removed. Firestore rules and authentication must allow the same operations as before.

Run `npm run lint` and `npm run build` before deploying. Check `/api/health`, image upload and retrieval, translation, authentication, and the webhook test on the preview deployment.

## Storage limits

Vercel functions have ephemeral disk. Uploaded images are recovered from the existing Firestore `storedImages` collection; local disk is only a cache. Firestore documents and Vercel function request bodies have size limits, so large image uploads need a dedicated object storage migration before they can be considered supported on Vercel.
