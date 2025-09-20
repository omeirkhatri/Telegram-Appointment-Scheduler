# BestDOC Appointment Scheduler

A comprehensive appointment scheduling system built with Next.js 14, Supabase, and TypeScript, designed specifically for BestDOC's healthcare services.

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
├── app/                    # Next.js App Router pages
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions and configurations
├── services/               # Business logic and API services
├── types/                  # TypeScript type definitions
└── utils/                  # Helper functions

supabase/
├── migrations/             # Database migration files
└── seed.sql               # Database seed data

scripts/
├── backup-manager.sh       # Backup management system
├── backup-before-commit.sh # Pre-commit backup script
└── setup-backup-system.sh # Backup system setup

data-export/               # Backup storage directory
├── latest_backup/         # Symlink to latest backup
└── backup_*/             # Timestamped backups
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
- 👥 **Staff Management**: Add, edit, and manage healthcare staff
- 👤 **Patient Management**: Comprehensive patient records
- 📅 **Appointment Scheduling**: Flexible appointment booking
- 🔗 **Staff Assignments**: Link staff to appointments
- 📱 **Mobile Responsive**: Works on all devices

### Advanced Features
- 🗺️ **Google Maps Integration**: Patient location mapping
- 📧 **Telegram Notifications**: Automated appointment reminders
- 🖨️ **Print Support**: Generate appointment sheets and agendas
- 📈 **Reporting**: Appointment statistics and analytics
- 🔍 **Search & Filter**: Find appointments and patients quickly

### Data Protection
- 🛡️ **Automated Backups**: Never lose data again
- 🔒 **Row Level Security**: Secure data access
- 📝 **Audit Trails**: Track all changes
- 🔄 **Easy Restoration**: Quick data recovery

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Database**: PostgreSQL with Row Level Security
- **ORM**: Drizzle ORM
- **Maps**: Google Maps API
- **Notifications**: Telegram Bot API
- **Deployment**: Docker, Docker Compose

## 📚 Documentation

- 📖 **Backup System**: `BACKUP_SYSTEM.md`
- 🗺️ **Google Maps Setup**: `docs/google-maps-setup.md`
- 🐳 **Docker Guide**: `DOCKER_DEVELOPMENT_GUIDE.md`
- 📱 **Telegram Integration**: `TELEGRAM_INTEGRATION.md`

## 🚀 Deployment

### Production Setup
```bash
# Build the application
npm run build

# Start production server
npm start

# Or use Docker
docker-compose -f docker-compose.production.yml up
```

### Environment Variables
Copy `.env.example` to `.env.local` and configure:
- Supabase URL and keys
- Google Maps API key
- Telegram Bot token
- Database connection details

## 🤝 Contributing

1. **Always backup before changes**:
   ```bash
   ./scripts/backup-manager.sh create "feature-branch"
   ```

2. **Test your changes** thoroughly

3. **Follow the backup system** - it will protect your data

4. **Document any new features** in the appropriate docs

## 📞 Support

If you encounter any issues:
1. Check the backup system status: `./scripts/backup-manager.sh status`
2. Restore from latest backup if needed: `./scripts/backup-manager.sh latest`
3. Review the documentation in `BACKUP_SYSTEM.md`
4. Check the logs for error details

## 🔒 Security

- All data is protected with Row Level Security
- Automated backups ensure data safety
- Pre-commit hooks prevent accidental data loss
- Comprehensive audit trails for all changes

---

**Remember**: Your data is precious. The backup system is your safety net. Use it, and you'll never lose data again! 🛡️