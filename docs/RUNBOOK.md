# Mostrara Runbook

## Production

- App: https://mostrara.vercel.app
- Health: https://mostrara.vercel.app/api/health
- Hosting: Vercel project `mostrara`
- Database: linked Supabase project `wzytxexedahijpzbbucv`

## Required Environment Variables

Production must have:

- `DATABASE_URL`
- `JWT_SECRET` or `SESSION_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CORS_ORIGIN`
- `RATE_LIMIT_PER_MINUTE`

`JWT_SECRET` and `SESSION_SECRET` must be strong random values. Do not use local dev defaults in production.

## Deploy

```powershell
corepack pnpm --filter @workspace/api-server run typecheck
corepack pnpm --filter @workspace/mostrara run typecheck
corepack pnpm --filter @workspace/api-server run build
corepack pnpm --filter @workspace/mostrara run build
corepack pnpm dlx vercel --prod --yes --archive=tgz
```

## Smoke Tests

```powershell
corepack pnpm --filter @workspace/api-server run test
```

Manual checks:

- Create account.
- Log in.
- Create product with one image.
- Open public store link.
- Register sale.
- Confirm dashboard stats update.

## Database Migrations

```powershell
corepack pnpm dlx supabase login --token <token>
corepack pnpm dlx supabase link --project-ref wzytxexedahijpzbbucv
corepack pnpm dlx supabase migration list
corepack pnpm dlx supabase db push
corepack pnpm dlx supabase logout --yes
```

## Backup And Restore

Before risky migrations:

```powershell
corepack pnpm dlx supabase db dump --linked --file supabase-backup.sql
```

Restore must be tested in a separate Supabase project first. Do not restore directly into production unless the app is in maintenance mode.

## Rollback

For app rollback:

1. Open Vercel project deployments.
2. Promote previous known-good production deployment.
3. Run smoke tests.

For database rollback:

- Prefer forward-fix migrations.
- If data corruption occurs, stop writes, dump current state, restore backup into staging, inspect, then restore production only after confirming impact.

## Known Architecture Notes

- Current auth is app-managed JWT + `public.users`, not Supabase Auth.
- Supabase also contains legacy/prototype tables such as `lojas`, `produtos`, and `pedidos`. Do not drop them until ownership is confirmed.
- Product and sale money columns use `numeric(12,2)`.
- Browser errors are reported to `/api/client-errors` and logged by backend.
