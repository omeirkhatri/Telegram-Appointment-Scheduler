# MediCare Scheduler

A comprehensive healthcare appointment scheduling system built with Next.js 14, Supabase, and Google Calendar integration.

## Features

- 📅 **Appointment Management**: Create, edit, and manage healthcare appointments
- 👥 **Patient & Staff Management**: Complete patient and staff directory
- 🔄 **Google Calendar Integration**: Bidirectional sync with Google Calendar
- 📧 **Email Notifications**: Daily agenda emails for staff
- 🏥 **Healthcare-Specific**: Designed for medical appointments and workflows
- 🌍 **Timezone Support**: Full support for Asia/Dubai timezone (GMT+4)
- 🔒 **Secure**: Built with security best practices and data validation

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Calendar**: Google Calendar API v3
- **Email**: SMTP integration
- **Testing**: Jest, React Testing Library, Playwright

## Quick Start

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- Supabase CLI (for local development)
- Google Cloud Platform account (for calendar integration)

### 1. Clone and Install

```bash
git clone <repository-url>
cd scheduler
npm install
```

### 2. Environment Setup

```bash
# Copy the environment template
cp env.example .env.local

# Edit .env.local with your configuration
# See docs/environment-setup.md for detailed instructions
```

### 3. Validate Configuration

```bash
# Check your environment configuration
npm run validate-env
```

### 4. Start Local Services

#### Option A: Docker Compose (Recommended)

```bash
# Set up and start all services with Docker
./scripts/docker-setup.sh setup

# Or manually:
docker-compose up -d
```

#### Option B: Traditional Setup

```bash
# Start local Supabase (Docker required)
npx supabase start

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

#### Docker Service URLs

When using Docker Compose, the following services are available:

- 📱 **Next.js App**: http://localhost:3000
- 🗄️ **Supabase Studio**: http://localhost:54323
- 📧 **Email Testing**: http://localhost:54324
- 🔗 **Supabase API**: http://localhost:54321
- 🗃️ **Database**: localhost:54322
- 📊 **Redis**: localhost:6379

## Environment Configuration

The application requires several environment variables for full functionality. See the comprehensive setup guide:

📖 **[Environment Setup Guide](docs/environment-setup.md)**

### Required Services

1. **Supabase**: Database and authentication
2. **Google Calendar API**: Calendar integration
3. **SMTP**: Email notifications (optional)

### Quick Environment Check

```bash
npm run validate-env
```

This will validate your configuration and provide helpful suggestions.

## Cloud Migration

For migrating from local development to Supabase Cloud:

📖 **[Cloud Migration Guide](docs/cloud-migration.md)**

### Quick Migration Commands

```bash
# Validate your local database
npm run migrate:validate

# Create backup
npm run migrate:backup

# Migrate to cloud
npm run migrate:to-cloud

# Rollback if needed
npm run migrate:rollback
```

## Cron Worker

For automated daily email sending:

📖 **[Cron Worker Setup Guide](docs/cron-worker-setup.md)**

### Quick Worker Commands

```bash
# Start the worker service
npm run worker:start

# Check worker status
npm run worker:status

# View worker logs
npm run worker:logs

# Stop the worker
npm run worker:stop

# Restart the worker
npm run worker:restart
```

## Observability

For comprehensive system monitoring and observability:

📖 **[Observability Setup Guide](docs/observability-setup.md)**

### Quick Observability Commands

```bash
# Check system health
curl http://localhost:3000/api/health

# Get detailed observability status
curl http://localhost:3000/api/observability/status

# View observability dashboard in browser
# Navigate to the observability section in the app
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback
and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the
[Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)
from the creators of Next.js.

Check out our
[Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)
for more details.
