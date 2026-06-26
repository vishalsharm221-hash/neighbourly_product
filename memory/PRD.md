# Localy — Delhi NCR Community App

## Overview
Hyperlocal community app for Delhi NCR (Delhi, Gurugram, Noida, Ghaziabad, Faridabad) — like Nextdoor. Production-ready, no seed data. Powered by Appwrite Cloud.

## Stack
- Frontend: Expo SDK 54 (React Native 0.81) + expo-router
- Backend: Appwrite Cloud (SGP region)
  - Database: `localy`
  - Collections: `profiles`, `posts`, `events`, `market`, `likes`, `rsvps`
  - Storage bucket: `media`
  - Auth: email/password sessions
- FastAPI service: kept as a no-op stub (not used; supervisor compatibility only)

## Features (production-ready)
1. **Email/password authentication** — Appwrite Account sessions
2. **Onboarding** — choose city + locality from 200+ real Delhi NCR localities
3. **Feed** — posts filtered to your city; categories (General / Recos / Safety / Events / For Sale); likes
4. **Events** — local events with RSVP
5. **Marketplace** — buy/sell with neighbours; ₹ price, photos
6. **Create flows** — posts, events, marketplace listings with image upload to Storage
7. **Profile** — change city/locality, log out

## Appwrite Configuration
- Web platforms registered: `delhi-neighbours.preview.emergentagent.com`, `localhost`
- For native builds, you must add the matching iOS/Android platform in Appwrite Console with bundle id `in.localy.app`

## Important Notes
- **Storage / file uploads** require a real native or web build — works fine in this preview.
- **Real city data**: 200+ localities baked into `/app/frontend/src/data.ts`.
- **No seed users / no demo posts** — first-launch experience for a brand-new neighbourhood.
