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

Copy `.env.example` to `.env.local`, then fill in the publishable key shown by `npm run db:status`.

```bash
npm run dev
```

The app runs at http://localhost:3000. The public pages don't need Supabase yet.

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

## Structure

| Path | Contents |
|:--|:--|
| `src/app` | Routes; `(app)` holds the pages with the main navigation |
| `src/components` | Shared components; `ui` holds shadcn/ui components |
| `src/i18n` | Interface text, one dictionary per language |
| `src/lib` | Non-UI code, including environment validation and Supabase clients |
| `supabase` | Local Supabase configuration |

## Notes

- `@vitejs/plugin-react` is not installed because its dependencies conflict with shadcn's Babel version. Vitest compiles JSX without it.
- Never put a Supabase service-role key in a `NEXT_PUBLIC_*` variable.
