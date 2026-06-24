# Neighbourly Web

Next.js 15 app sharing the same Appwrite Cloud backend as the mobile app — same users, same posts, same data.

## Quick start

```bash
cd /app/apps/web
yarn install
yarn dev   # http://localhost:3001
```

## Deploy to Vercel

1. Push `/app/apps/web` to a Git repo (or use the whole `/app` monorepo)
2. Import in Vercel, set root directory to `apps/web`
3. Add env vars:
   - `NEXT_PUBLIC_APPWRITE_ENDPOINT` = `https://sgp.cloud.appwrite.io/v1`
   - `NEXT_PUBLIC_APPWRITE_PROJECT_ID` = `6a3b7680002e8d01dd74`
4. In Appwrite Console → Project Settings → Platforms, add a **Web** platform with your Vercel hostname (e.g. `neighbourly.vercel.app`).

## Current scope
The MVP page demonstrates **email OTP login + profile fetch from the shared Appwrite database**. Full feed / posts / follow UI for the web app is the next step — backend is already complete.
