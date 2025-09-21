# MediCare Scheduler

A comprehensive healthcare appointment scheduling system built with Next.js 14, Supabase, and advanced Telegram integration for real-time staff notifications.

## Purpose

MediCare Scheduler is designed specifically for **Best DOC**, a single-company healthcare provider, to streamline and optimize their appointment management workflow. The application serves as a centralized platform for:

### 🏥 **Primary Purpose**

* **Healthcare Appointment Management**: Streamline scheduling for various medical services including doctor visits, lab tests, physiotherapy, caregiver services, and IV therapy
* **Staff Coordination**: Efficiently manage and coordinate healthcare staff including doctors, nurses, physiotherapists, caregivers, drivers, and lab technicians
* **Patient Care Optimization**: Ensure timely and organized patient care through structured appointment scheduling and real-time notifications
* **Operational Efficiency**: Reduce administrative overhead and improve communication between staff members and patients

### 🎯 **Business Objectives**

* **Single-Company Focus**: Tailored specifically for Best DOC's healthcare operations (no multi-tenant complexity)
* **Role-Based Access**: Separate interfaces and permissions for administrators and caregivers
* **Mobile-Friendly**: Optimized for caregivers who need mobile access while maintaining desktop functionality for administrators
* **Real-Time Communication**: Instant notifications via Telegram to keep staff informed and coordinated
* **Timezone Compliance**: Full support for Asia/Dubai timezone (GMT+4) to match local operations

### 🔧 **Technical Purpose**

* **Modern Technology Stack**: Built with Next.js 14, Supabase, and TypeScript for reliability and maintainability
* **Scalable Architecture**: Designed to handle Best DOC's growing patient and staff base
* **Integration Ready**: Built with Telegram integration and prepared for other healthcare system integrations
* **Data Security**: Implemented with healthcare-grade security practices and data protection

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Supabase CLI

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd Telegram-Appointment-Scheduler

# Install dependencies
npm install

# Start Supabase locally
supabase start

# Run the development server
npm run dev
```

### Access Points
- 🌐 **Application**: http://localhost:3000
- 🗄️ **Supabase Studio**: http://localhost:54323
- 📊 **Database**: localhost:54322

## 🛡️ Data Protection & Backup System

**IMPORTANT**: This project includes an automated backup system to protect your data.

### Automatic Backups
- **Pre-commit hooks**: Automatically backup before commits containing database migrations
- **Danger detection**: Warns about destructive operations (DELETE, DROP, TRUNCATE)
- **Easy restoration**: Simple commands to restore from any backup

### Manual Backup Commands
```bash
# Create a backup
./scripts/backup-manager.sh create "backup-name"

# List all backups
./scripts/backup-manager.sh list

# Restore from backup
./scripts/backup-manager.sh restore "backup-name"

# Restore latest backup
./scripts/backup-manager.sh latest

# Clean old backups (30+ days)
./scripts/backup-manager.sh clean
```

### Backup System Features
- ✅ **Automatic pre-commit backups** for migration files
- ✅ **Multiple backup formats** (schema, data, individual tables)
- ✅ **Easy restoration** with one command
- ✅ **Backup management** (list, clean, status)
- ✅ **Safety warnings** for destructive operations
- ✅ **Comprehensive documentation** in `BACKUP_SYSTEM.md`

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── (auth)/            # Authentication pages (grouped)
│   ├── dashboard/         # Dashboard pages
│   ├── patients/          # Patient management pages
│   ├── staff/             # Staff management pages
│   ├── appointments/      # Appointment management pages
│   ├── schedules/         # Schedule management pages
│   ├── payments/          # Payment pages (placeholder)
│   ├── api/               # API route handlers
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable React components
│   ├── ui/               # Base UI components (buttons, inputs, etc.)
│   ├── layout/           # Layout components (header, sidebar, footer)
│   ├── forms/            # Form components
│   ├── modals/           # Modal and dialog components
│   └── calendar/         # Calendar-specific components
├── hooks/                 # Custom React hooks
├── services/              # Business logic and external service integrations
├── lib/                   # Third-party library configurations
├── utils/                 # Utility functions and helpers
├── types/                 # TypeScript type definitions
├── constants/             # Application constants
├── styles/                # Additional CSS styles
└── jobs/                  # Background job definitions

supabase/
├── migrations/            # Database migration files
├── seed.sql              # Database seed data
└── config.toml           # Supabase configuration

tests/
├── e2e/                   # End-to-end tests
├── accessibility/         # Accessibility tests
├── performance/           # Performance tests
└── README.md             # Testing documentation

scripts/
├── backup-manager.sh      # Backup management system
├── backup-before-commit.sh # Pre-commit backup script
├── setup-backup-system.sh # Backup system setup
├── docker-setup.sh       # Docker development setup
└── run-comprehensive-tests.sh # Test runner

docs/                      # Documentation files
data-export/              # Backup storage directory
├── latest_backup/        # Symlink to latest backup
└── backup_*/            # Timestamped backups
```

## 🔧 Development

### Database Management
```bash
# Reset database with all migrations
supabase db reset

# Reset without seed data
supabase db reset --no-seed

# Apply new migrations
supabase db push

# Check database status
supabase status
```

### Backup System Setup
```bash
# Setup backup system (run once)
./scripts/setup-backup-system.sh

# Test backup system
./scripts/backup-manager.sh status
```

## 🚨 Data Safety

### Before Making Changes
1. **Always create a backup** before major changes:
   ```bash
   ./scripts/backup-manager.sh create "before-changes"
   ```

2. **Test your changes** on a copy of the data

3. **If something goes wrong**, restore from backup:
   ```bash
   ./scripts/backup-manager.sh latest
   ```

### Pre-commit Protection
The system automatically:
- Detects migration files in commits
- Warns about dangerous operations
- Creates backups before destructive changes
- Prevents commits if backup fails

## 📊 Features

### Core Functionality
- 👥 **Staff Management**: Add, edit, and manage healthcare staff with role-based permissions
- 👤 **Patient Management**: Comprehensive patient records with medical history tracking
- 📅 **Appointment Scheduling**: Flexible appointment booking with calendar integration
- 🔗 **Staff Assignments**: Link staff to appointments with availability checking
- 📱 **Mobile Responsive**: Optimized for caregivers on mobile devices
- 🏥 **Healthcare-Specific**: Designed for medical appointments and workflows

### Advanced Features
- 🗺️ **Google Maps Integration**: Patient location mapping and navigation
- 📧 **Telegram Notifications**: Real-time appointment reminders and staff communication
- 📧 **Email Notifications**: Daily agenda emails for staff
- 🖨️ **Print Support**: Generate appointment sheets and agendas
- 📈 **Reporting**: Appointment statistics and analytics
- 🔍 **Search & Filter**: Find appointments and patients quickly
- 🌍 **Timezone Support**: Full support for Asia/Dubai timezone (GMT+4)
- 🔄 **Recurring Appointments**: Support for recurring appointment patterns

### Data Protection & Security
- 🛡️ **Automated Backups**: Never lose data again with pre-commit backup system
- 🔒 **Row Level Security**: Secure data access with Supabase RLS
- 📝 **Audit Trails**: Track all changes and modifications
- 🔄 **Easy Restoration**: Quick data recovery from any backup point
- 🔐 **Healthcare-Grade Security**: HIPAA-compliant data protection

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router, TypeScript)
- **UI Library**: React 18, Tailwind CSS
- **State Management**: React Hooks, Context API
- **Date Handling**: date-fns, date-fns-tz
- **Maps**: Google Maps API
- **Testing**: Jest, React Testing Library, Playwright

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Link)
- **ORM**: Drizzle ORM
- **API**: Next.js Route Handlers + Server Actions
- **Storage**: Supabase Storage
- **Security**: Row Level Security (RLS)

### Integrations
- **Notifications**: Telegram Bot API
- **Email**: SMTP integration
- **Maps**: Google Maps API
- **Calendar**: Google Calendar API

### Development & Deployment
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions
- **Testing**: Jest, Playwright, Accessibility Testing
- **Code Quality**: ESLint, Prettier
- **Monitoring**: Built-in observability system

## 🧪 Testing

### Comprehensive Test Suite
- **Unit Tests**: Jest + React Testing Library for component testing
- **Integration Tests**: API endpoint testing and service integration
- **E2E Tests**: Playwright for complete user journey testing
- **Accessibility Tests**: WCAG 2.1 AA compliance testing
- **Performance Tests**: Lighthouse audits and performance monitoring

### Test Coverage
- **Forms**: All form submissions and validations
- **API Endpoints**: Complete API testing suite
- **User Interactions**: Button clicks, navigation, and workflows
- **Critical Flows**: Patient management, staff management, appointment scheduling
- **Accessibility**: Screen reader compatibility, keyboard navigation
- **Performance**: Page load times, calendar rendering, Google sync latency

### Running Tests
```bash
# Run all tests
npm run test:comprehensive

# Run specific test types
npm run test:unit
npm run test:e2e
npm run test:accessibility
npm run test:performance

# Run tests with UI
npm run test:e2e:ui
npm run test:e2e:debug
```

## 📚 Documentation

- 📖 **Backup System**: `BACKUP_SYSTEM.md`
- 🗺️ **Google Maps Setup**: `docs/google-maps-setup.md`
- 🐳 **Docker Guide**: `DOCKER_DEVELOPMENT_GUIDE.md`
- 📱 **Telegram Integration**: `TELEGRAM_INTEGRATION.md`
- 🌐 **Environment Setup**: `docs/environment-setup.md`
- 📊 **Observability**: `docs/observability-setup.md`
- ☁️ **Cloud Migration**: `docs/cloud-migration.md`

## 🚀 Deployment

### Production Setup
```bash
# Build the application
npm run build

# Start production server
npm start

# Or use Docker
docker-compose -f docker/docker-compose.production.yml up
```

### Docker Development
```bash
# Set up and start all services with Docker
./docker/docker-setup.sh setup

# Or manually:
docker-compose -f docker/docker-compose.yml up -d
```

### Docker Service URLs
When using Docker Compose, the following services are available:
- 📱 **Next.js App**: http://localhost:3000
- 🗄️ **Supabase Studio**: http://localhost:54323
- 📧 **Email Testing**: http://localhost:54324
- 🔗 **Supabase API**: http://localhost:54321
- 🗃️ **Database**: localhost:54322
- 📊 **Redis**: localhost:6379

### Environment Variables
Copy `.env.example` to `.env.local` and configure:
- **Supabase**: URL, anon key, service role key
- **Google Maps**: API key for location services
- **Telegram**: Bot token for notifications
- **Email**: SMTP configuration for notifications
- **Database**: Connection details and credentials

### Cloud Migration
For migrating from local development to Supabase Cloud:
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

## 🔔 Reminder Workers

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

### Reminder System Features
- **Automated Notifications**: 30-minute advance appointment reminders
- **Telegram Integration**: Real-time staff notifications
- **Email Notifications**: Daily agenda emails for staff
- **Configurable Timing**: Customizable reminder intervals
- **Error Handling**: Robust error handling and retry logic

## 🤝 Contributing

1. **Always backup before changes**:
   ```bash
   ./scripts/backup-manager.sh create "feature-branch"
   ```

2. **Test your changes** thoroughly:
   ```bash
   npm run test:comprehensive
   ```

3. **Follow the backup system** - it will protect your data

4. **Document any new features** in the appropriate docs

5. **Ensure accessibility compliance**:
   ```bash
   npm run test:accessibility
   ```

6. **Check performance impact**:
   ```bash
   npm run test:performance
   ```

## 📊 Observability

For comprehensive system monitoring and observability:

### Quick Observability Commands
```bash
# Check system health
curl http://localhost:3000/api/health

# Get detailed observability status
curl http://localhost:3000/api/observability/status

# View observability dashboard in browser
# Navigate to the observability section in the app
```

### Observability Features
- **Health Monitoring**: System health checks and status monitoring
- **Performance Metrics**: Real-time performance monitoring
- **Error Tracking**: Comprehensive error logging and tracking
- **Usage Analytics**: Application usage and user behavior analytics
- **Resource Monitoring**: Database, API, and system resource monitoring

## 📞 Support

If you encounter any issues:
1. Check the backup system status: `./scripts/backup-manager.sh status`
2. Restore from latest backup if needed: `./scripts/backup-manager.sh latest`
3. Review the documentation in `BACKUP_SYSTEM.md`
4. Check the logs for error details
5. Run system health check: `curl http://localhost:3000/api/health`
6. Check observability dashboard for system metrics

## 🔒 Security

- **Row Level Security**: All data is protected with Supabase RLS
- **Automated Backups**: Comprehensive backup system ensures data safety
- **Pre-commit Hooks**: Prevent accidental data loss during development
- **Audit Trails**: Comprehensive audit trails for all changes
- **Healthcare-Grade Security**: HIPAA-compliant data protection
- **Secure Authentication**: Magic link authentication with Supabase Auth
- **Data Encryption**: All data encrypted in transit and at rest
- **Access Control**: Role-based access control for admin and caregiver roles

## 🏥 About Best DOC

**Best DOC** is a leading healthcare provider in the UAE, specializing in comprehensive medical services including:

- **Doctor Consultations**: General practice and specialist consultations
- **Lab Services**: Comprehensive laboratory testing and diagnostics
- **Physiotherapy**: Physical therapy and rehabilitation services
- **Caregiver Services**: In-home healthcare and assistance
- **IV Therapy**: Intravenous therapy and medical treatments

This scheduling system is specifically designed to support Best DOC's operations, ensuring efficient patient care coordination and staff management.

---

**Remember**: Your data is precious. The backup system is your safety net. Use it, and you'll never lose data again! 🛡️

## 📄 License

This project is proprietary software developed specifically for Best DOC. All rights reserved.

## 🤝 Contact

For questions about this project or Best DOC's services, please contact the development team or visit Best DOC's official channels.
