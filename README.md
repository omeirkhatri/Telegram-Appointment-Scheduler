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

```bash
# Start local Supabase (Docker required)
npx supabase start

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

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
