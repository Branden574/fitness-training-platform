# Fitness Training Platform

A full-stack web application for personal trainers to manage clients, schedule appointments, track workouts, and monitor nutrition and progress — all in one place.

## Features

- **Trainer Dashboard** — Manage clients, view appointments, assign workouts and meal plans
- **Client Dashboard** — Log daily nutrition, track progress, view assigned workouts
- **Appointment Booking** — Clients request sessions; trainers approve or reject
- **Workout Management** — Create templates, assign sessions, track exercise progress
- **Nutrition Tracking** — Log food entries, track macros, manage meal plans
- **Progress Analytics** — Body measurements, weight trends, goal tracking
- **Notifications** — Real-time alerts for appointments, messages, and updates
- **Admin Panel** — User management, platform oversight

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (via Prisma ORM) |
| Auth | NextAuth.js |
| Hosting | Railway |
| DNS / CDN | Cloudflare |
| Email | Resend |
| Styling | Tailwind CSS |

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or Railway)

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL, NEXTAUTH_SECRET, etc.

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret for NextAuth session signing |
| `NEXTAUTH_URL` | Full URL of the app (e.g. `https://replabusa.com`) |
| `RESEND_API_KEY` | API key for Resend email service |

See `.env.example` for a full list.

## Project Structure

```
fitness-training-platform/
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   │   ├── api/          # API endpoints
│   │   ├── trainer/      # Trainer-facing pages
│   │   ├── client/       # Client-facing pages
│   │   ├── admin/        # Admin panel
│   │   └── auth/         # Authentication pages
│   ├── components/       # Shared React components
│   └── lib/              # Utilities (auth, prisma, email, etc.)
├── prisma/               # Database schema and migrations
├── scripts/              # Utility and maintenance scripts
├── docs/                 # Project documentation
└── public/               # Static assets
```

## Deployment

The app is deployed on [Railway](https://railway.app) with automatic deployments from the `main` branch.

- **Production URL:** [replabusa.com](https://replabusa.com)
- **Health Check:** `/api/health`
- **Database:** Railway PostgreSQL

See [docs/DEPLOYMENT_SETUP.md](docs/DEPLOYMENT_SETUP.md) for detailed deployment instructions.

## Scripts

Utility and maintenance scripts are in the `/scripts` directory. Most require a valid `DATABASE_URL` environment variable.

```bash
# Seed the database with initial data
npx tsx prisma/seed.ts
```

## Documentation

Extended documentation is in the `/docs` directory:

- [Deployment Setup](docs/DEPLOYMENT_SETUP.md)
- [Railway Migration](docs/RAILWAY_MIGRATION.md)
- [Security Overview](docs/SECURITY.md)
- [Admin Dashboard Guide](docs/ADMIN_DASHBOARD_GUIDE.md)
- [Daily Progress Guide](docs/DAILY_PROGRESS_GUIDE.md)
