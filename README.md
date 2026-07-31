# Ugochukwu Chukwu Christian — Portfolio & Admin Dashboard

A full-stack developer portfolio with a WhatsApp-based booking flow, a client review pipeline with
moderation, and a protected admin dashboard for managing content and analytics.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind CSS v4 + Framer Motion
- **PostgreSQL via Supabase**, accessed through **Prisma 7** (driver adapter, `@prisma/adapter-pg`)
- Custom JWT admin auth (`jose` + `bcryptjs`), no third-party auth provider

## Project structure

```
src/app/
  (marketing)/    public site — Home, About, Services, Portfolio, Reviews, Announcements, Contact
  (dashboard)/    /admin — login + sidebar shell (Dashboard, Bookings, Projects, Reviews, Announcements)
  api/            REST route handlers backing both areas above
src/components/   shared UI, home sections, admin dashboard widgets
src/lib/          Prisma client, auth, validation, WhatsApp link builder, services data
prisma/           schema.prisma, migrations, seed.ts
```

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** (or point at any Postgres instance) and copy `.env.example` to
   `.env`, filling in:
   - `DATABASE_URL` / `DIRECT_URL` — pooled and direct Postgres connection strings
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — your admin login (used by the seed script)
   - `JWT_SECRET` — a long random string (`openssl rand -base64 48`)
   - `NEXT_PUBLIC_WHATSAPP_NUMBER` — digits only, country code included
   - `NEXT_PUBLIC_SITE_URL` — used for the sitemap, robots.txt, and Open Graph tags

3. **Run the migration and seed the database**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   This creates your admin user, default site settings, and a few sample projects/reviews/announcements
   you can edit or delete from `/admin`.

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` for the public site and `/admin/login` for the dashboard.

## Other scripts

- `npm run build` / `npm run start` — production build and run
- `npm run lint` — ESLint
- `npm run db:studio` — Prisma Studio, a GUI for browsing/editing the database directly
- `npm run db:seed` — re-run the seed script (safe to re-run; it upserts, not duplicates)

## Deploying

**Database (Supabase):** already hosted — no extra steps beyond the local setup above. Consider
rotating the database password if it was ever shared outside your own machine.

**App (Vercel):**

1. Push this repo to GitHub and import it in Vercel.
2. Add every variable from `.env` to the Vercel project's Environment Variables (Production and
   Preview). Set `NEXT_PUBLIC_SITE_URL` to your real production domain.
3. Deploy. Vercel runs `npm run build`, which also runs `prisma generate` via the `postinstall`
   script.
4. Run the migration against production once, from your machine, pointed at the production
   `DATABASE_URL`/`DIRECT_URL` (or via `vercel env pull` + `npm run db:migrate`).

No separate backend deployment is needed — the API routes under `src/app/api` run as part of the
same Next.js deployment.
