# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains the **VitrinePro** SaaS app — a digital storefront platform for iPhone/phone resellers in Rio de Janeiro, with a white/red/black design system.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm (`/nix/store/61lr9izijvg30pcribjdxgjxvh3bysp4-pnpm-10.26.1/bin/pnpm`)
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (bundles api-server)

## Artifacts

### `artifacts/vitrinepro` — Frontend (React + Vite)
- Port: 23131, preview path: `/`
- Color system: white bg, `red-600` primary, `gray-900` sidebar/dark
- Routes: `/` (Landing), `/dashboard/*` (protected), `/loja/:storeSlug` (public storefront)
- Auth: JWT stored in `sessionStorage`, managed by `AuthContext`
- Key pages: Landing, Dashboard (Overview/Products/Sales/Store/Settings), Storefront

### `artifacts/api-server` — Backend (Express)
- Port: 8080, routes mounted at `/api`
- Auth: bcryptjs + jsonwebtoken (30d tokens)
- Photo storage: Supabase Storage (optional — requires `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` env vars)
- Routes: `/api/auth`, `/api/products`, `/api/sales`, `/api/dashboard`, `/api/store`, `/api/settings`

### `lib/db` — Database Schema
- Tables: `users`, `products`, `sales`
- Push schema: `pnpm --filter @workspace/db run push`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `/nix/store/61lr9izijvg30pcribjdxgjxvh3bysp4-pnpm-10.26.1/bin/pnpm --filter @workspace/db run push` — push DB schema
- `/nix/store/61lr9izijvg30pcribjdxgjxvh3bysp4-pnpm-10.26.1/bin/pnpm --filter @workspace/api-server add <pkg>` — install packages

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection (provisioned)
- `SESSION_SECRET` — set in secrets
- `JWT_SECRET` — optional override (defaults to hardcoded dev secret)
- `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` — optional, for photo uploads

## Design System

- Background: `white` / `gray-50`
- Primary: `red-600` (#DC2626)
- Sidebar/dark: `gray-900` (#111827)
- Text: `gray-900` (headings), `gray-500` (body), `gray-400` (muted)
- Radius: `rounded-xl` (12px), `rounded-2xl` (16px)
- Font: Inter (system stack via Tailwind)
