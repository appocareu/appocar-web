# APPOCAR

APPOCAR is a premium, iOS 18-inspired car marketplace built as a web + mobile product with Supabase-backed auth, listings, favorites, and messaging.

- `apps/web` — Next.js web app (marketing + marketplace UI)
- `apps/mobile` — Expo React Native app (iOS/Android)
- `packages/shared` — shared types, mock data, and Supabase client
- `supabase` — schema and seed SQL

## Quick start

```bash
pnpm install
pnpm dev:web
```

For mobile:

```bash
pnpm dev:mobile
```

## Supabase

Set environment variables for real data:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Load the schema and seed in Supabase using `supabase/schema.sql` and `supabase/seed.sql`.

## Replit backend integration

Frontend can use external backend APIs hosted on Replit.

Required web env vars:

```
NEXT_PUBLIC_API_BASE_URL=https://appocar-builder--appocareu.replit.app
NEXT_PUBLIC_ADMIN_EMAIL=appocar.eu@gmail.com
```

Expected backend routes:

- `GET /api/health`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/listings`
- `GET /api/admin/overview`
- `POST /api/admin/webhook/test`

For cookie auth across domains configure backend CORS:

- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Origin: https://<frontend-domain>` (not `*`)
- session cookie with `SameSite=None; Secure`

## Functional flow (web + mobile)

- Auth: email/password sign in + sign up
- Listings: publish new listings from `/sell`
- Favorites: save listings to the `favorites` table
- Messaging: start a conversation from a listing and continue in `/messages`
