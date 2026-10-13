# RentSpace

RentSpace is a role-based dormitory and apartment management application built for Lady D's Dormitory and Apartment. It brings tenant onboarding, rental assignments, rent monitoring, payments, maintenance, messaging, notifications, and reports into one workspace.

## Features

- Admin, landlord, and tenant portals
- Registration and approval workflows
- Apartment, room, and bed-space management
- Tenant assignments and occupancy tracking
- Monthly rental obligations and payment verification
- GCash proof and manual cash-payment workflows
- Maintenance requests with photo attachments
- Direct messaging and notifications
- AI Rental Analytics with deterministic KPIs, six-month trends, prioritized risks, and aggregate-only AI insights
- OpenRouter-powered, read-only landlord operations assistant
- Profile photos and account administration
- Supabase Row Level Security policies and database constraints

## Technology

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, Storage, and Realtime
- OpenRouter Chat Completions API

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and provide values from your Supabase project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SECRET_KEY=your_server_only_secret_key
OPENROUTER_API_KEY=your_server_only_openrouter_api_key
OPENROUTER_MODEL=openrouter/free
```

`SUPABASE_SECRET_KEY` is used only by privileged server-side account-management and maintenance scripts, including creating pending Admin registration requests. The legacy `SUPABASE_SERVICE_ROLE_KEY` name is also supported. Never expose this secret in browser code, commit it to Git, or prefix it with `NEXT_PUBLIC_`.

`OPENROUTER_API_KEY` enables the Landlord AI Assistant and AI Rental Analytics insights. `OPENROUTER_MODEL` defaults to `openrouter/free`; the server rejects any configured model that is not `openrouter/free` or suffixed with `:free`, preventing accidental paid-model usage. Keep the key server-only and configure both variables in each Vercel environment. The assistant sends a limited copy of the signed-in Landlord's authorized operational records to OpenRouter and is not given tools that can modify records. AI Rental Analytics sends only calculated aggregate metrics and trends, not tenant names or maintenance descriptions.

### AI API structure

The external LLM integration is intentionally isolated so it is easy to review:

```text
src/lib/api/openrouter/
├── client.ts                # Free-only OpenRouter request
├── rental-analytics.ts      # Aggregate-only analytics interpretation
└── rentspace-assistant.ts   # RentSpace prompt and context contract
```

The authenticated entry point is `src/app/actions/ai-assistant.ts`.

Set `NEXT_PUBLIC_SITE_URL` to the deployed application origin in production, for example `https://example.com`. In Supabase **Authentication → URL Configuration**, set the same production origin as the Site URL and add `https://example.com/auth/callback` to the Redirect URLs allow list. For local password-reset testing, also allow `http://localhost:3000/auth/callback`.

Admin registrations do not require a shared registration code. Every new Admin account starts in `pending` status and must be approved by an existing approved Admin from **Registration Approvals** before it can sign in.

### 3. Prepare Supabase

Apply the SQL migrations in `supabase/migrations` to your Supabase project in filename order. Review the migrations before applying them to an existing database.

### 4. Start development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run lint
npm run build
```

## Data reset utility

The repository includes a guarded reset script intended for the configured DormMate/RentSpace Supabase project.

Preview only:

```bash
npm run db:reset-data
```

Destructive execution requires the explicit confirmation argument and a server-only Supabase secret key:

```bash
npm run db:reset-data -- --execute=RESET-DORMMATE-DATA
```

Read and verify `scripts/reset-supabase-data.mjs` before using it. The script is project-ref guarded, but destructive database operations cannot be undone.

## Deployment

The application can be deployed to a Next.js-compatible platform such as Vercel. The Vercel Supabase integration provides `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`; verify that they are enabled for the intended Production and Preview environments, then redeploy. Keep `SUPABASE_SECRET_KEY` server-only.

Database migrations are not applied by a Vercel application build. Apply pending migrations to the connected Supabase project before deploying application code that depends on them.

## License

No open-source license has been granted. All rights are reserved by the repository owner.
