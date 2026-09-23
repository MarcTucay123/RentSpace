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
- Profile photos and account administration
- Supabase Row Level Security policies and database constraints

## Technology

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth, Postgres, Storage, and Realtime

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
SUPABASE_SECRET_KEY=your_server_only_secret_key
ADMIN_REGISTRATION_CODE=choose_a_long_random_server_only_code
```

`SUPABASE_SECRET_KEY` is used only by privileged server-side account-management and maintenance scripts. The legacy `SUPABASE_SERVICE_ROLE_KEY` name is also supported. `ADMIN_REGISTRATION_CODE` protects the Admin registration form exposed from the Admin login page. Use a long random value and share it only with authorized administrators. Never expose either secret in browser code, commit it to Git, or prefix it with `NEXT_PUBLIC_`.

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
