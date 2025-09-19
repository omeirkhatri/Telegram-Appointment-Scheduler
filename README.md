# MediCare Scheduler

A comprehensive healthcare appointment scheduling system built with Next.js 14, Supabase, and advanced Telegram integration for real-time staff notifications.

## Purpose

MediCare Scheduler is designed specifically for **Best DOC**, a single-company healthcare provider, to streamline and optimize their appointment management workflow. The application serves as a centralized platform for:

### 🏥 **Primary Purpose**
- **Healthcare Appointment Management**: Streamline scheduling for various medical services including doctor visits, lab tests, physiotherapy, caregiver services, and IV therapy
- **Staff Coordination**: Efficiently manage and coordinate healthcare staff including doctors, nurses, physiotherapists, caregivers, drivers, and lab technicians
- **Patient Care Optimization**: Ensure timely and organized patient care through structured appointment scheduling and real-time notifications
- **Operational Efficiency**: Reduce administrative overhead and improve communication between staff members and patients

### 🎯 **Business Objectives**
- **Single-Company Focus**: Tailored specifically for Best DOC's healthcare operations (no multi-tenant complexity)
- **Role-Based Access**: Separate interfaces and permissions for administrators and caregivers
- **Mobile-Friendly**: Optimized for caregivers who need mobile access while maintaining desktop functionality for administrators
- **Real-Time Communication**: Instant notifications via Telegram to keep staff informed and coordinated
- **Timezone Compliance**: Full support for Asia/Dubai timezone (GMT+4) to match local operations

### 🔧 **Technical Purpose**
- **Modern Technology Stack**: Built with Next.js 14, Supabase, and TypeScript for reliability and maintainability
- **Scalable Architecture**: Designed to handle Best DOC's growing patient and staff base
- **Integration Ready**: Built with Telegram integration and prepared for other healthcare system integrations
- **Data Security**: Implemented with healthcare-grade security practices and data protection

## Features

- 📅 **Appointment Management**: Create, edit, and manage healthcare appointments
- 👥 **Patient & Staff Management**: Complete patient and staff directory
- 📱 **Telegram Bot Integration**: Real-time appointment notifications and staff communication
- 📧 **Email Notifications**: Daily agenda emails for staff
- 🏥 **Healthcare-Specific**: Designed for medical appointments and workflows
- 🌍 **Timezone Support**: Full support for Asia/Dubai timezone (GMT+4)
- 🔒 **Secure**: Built with security best practices and data validation

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Notifications**: Telegram Bot API
- **Email**: SMTP integration
- **Testing**: Jest, React Testing Library, Playwright

## Quick Start

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- Supabase CLI (for local development)
- Telegram Bot Token (for notification features)

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
2. **Telegram Bot API**: Real-time notifications and staff communication
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

## Reminder Workers

For automated appointment reminders:

### Simple Reminder Workers

```bash
# Start 30-minute reminder worker
npm run reminders:30min

# Start simple reminder worker (API-based)
npm run reminders:simple

# Test reminder functionality
npm run reminders:test
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
