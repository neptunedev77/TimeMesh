# Development

## Stack

Next.js (App Router), React, strict TypeScript, Tailwind CSS, shadcn/ui, Supabase and Vitest.

## Requirements

- Node.js 24
- Docker Desktop running, for the local Supabase instance

## Setup

```bash
npm install
```

```bash
npm run db:start
```

Copy `.env.example` to `.env.local`, then fill in the publishable and secret keys shown by `npm run db:status`.

Local emails, such as password recovery, arrive at http://127.0.0.1:54324.

```bash
npm run dev
```

The app runs at http://localhost:3000.

## Commands

| Command | Purpose |
|:--|:--|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Run the unit tests once |
| `npm run test:watch` | Run the unit tests in watch mode |
| `npm run db:start` | Start local Supabase |
| `npm run db:status` | Show local Supabase URLs and keys |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:reset` | Recreate the local database from the migrations |
| `npm run db:types` | Regenerate the database types after changing the schema |
| `npm run test:db` | Run the access tests against local Supabase |

## Structure

| Path | Contents |
|:--|:--|
| `src/app` | Routes; `(app)` holds the pages with the main navigation |
| `src/components` | Shared components; `ui` holds shadcn/ui components |
| `src/i18n` | Interface text, one dictionary per language |
| `src/lib` | Non-UI code, including environment validation and Supabase clients |
| `src/lib/availability` | Compatibility engine, with no UI or database dependencies |
| `supabase` | Local Supabase configuration and database migrations |
| `tests/db` | Access tests that run against local Supabase |

## Notes

- `@vitejs/plugin-react` is not installed because its dependencies conflict with shadcn's Babel version. Vitest compiles JSX without it.
- The shadcn `Avatar` logs a `Date.now()` prerender error when used inside streamed server content, so `UserMenu` uses a plain element.
- Never put a Supabase service-role key in a `NEXT_PUBLIC_*` variable.
