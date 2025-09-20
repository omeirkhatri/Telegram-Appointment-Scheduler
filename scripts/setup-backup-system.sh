#!/bin/bash

# Setup script for the backup system
# This script configures all backup-related tools and hooks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Setting up backup system for BestDOC Scheduler...${NC}"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ This is not a git repository. Please run this from the project root.${NC}"
    exit 1
fi

# Create backup directory
echo -e "${YELLOW}📁 Creating backup directory...${NC}"
mkdir -p data-export

# Make scripts executable
echo -e "${YELLOW}🔧 Making scripts executable...${NC}"
chmod +x scripts/backup-before-commit.sh
chmod +x scripts/backup-manager.sh

# Setup pre-commit hook
echo -e "${YELLOW}🪝 Setting up pre-commit hook...${NC}"
if [ -f ".git/hooks/pre-commit" ]; then
    echo -e "${YELLOW}⚠️  Pre-commit hook already exists. Backing up...${NC}"
    mv .git/hooks/pre-commit .git/hooks/pre-commit.backup.$(date +%Y%m%d_%H%M%S)
fi

# Copy pre-commit hook
cp scripts/backup-before-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Create .gitignore entry for backup directory (optional)
echo -e "${YELLOW}📝 Updating .gitignore...${NC}"
if ! grep -q "data-export/" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Backup directory" >> .gitignore
    echo "data-export/" >> .gitignore
    echo -e "${GREEN}✅ Added data-export/ to .gitignore${NC}"
else
    echo -e "${BLUE}ℹ️  data-export/ already in .gitignore${NC}"
fi

# Create initial backup
echo -e "${YELLOW}🔄 Creating initial backup...${NC}"
if ./scripts/backup-manager.sh create "initial_setup_$(date +%Y%m%d_%H%M%S)"; then
    echo -e "${GREEN}✅ Initial backup created successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  Initial backup failed (this is normal if Supabase is not running)${NC}"
fi

# Create documentation
echo -e "${YELLOW}📚 Creating documentation...${NC}"
cat > BACKUP_SYSTEM.md << 'EOF'
# Backup System Documentation

## Overview
This project includes an automated backup system that protects your data before any potentially destructive operations.

## Features
- **Pre-commit hooks**: Automatically backup before commits containing migrations
- **Manual backups**: Create backups on-demand with custom names
- **Easy restoration**: Simple commands to restore from any backup
- **Cleanup tools**: Remove old backups to save space
- **Status monitoring**: Check backup status and disk usage

## Quick Start

### Create a Backup
```bash
# Create backup with timestamp
./scripts/backup-manager.sh create

# Create named backup
./scripts/backup-manager.sh create "before-major-changes"
```

### List Backups
```bash
./scripts/backup-manager.sh list
```

### Restore from Backup
```bash
# Restore from specific backup
./scripts/backup-manager.sh restore "backup_20250120_143022"

# Restore from latest backup
./scripts/backup-manager.sh latest
```

### Clean Old Backups
```bash
# Clean backups older than 30 days (default)
./scripts/backup-manager.sh clean

# Clean backups older than 7 days
./scripts/backup-manager.sh clean 7
```

### Check Status
```bash
./scripts/backup-manager.sh status
```

## How It Works

### Pre-commit Hooks
- Automatically detects migration files in commits
- Warns about dangerous operations (DELETE, DROP, TRUNCATE)
- Creates timestamped backups before destructive migrations
- Prevents commits if backup fails

### Backup Structure
Each backup contains:
- `schema.sql` - Database schema
- `data.sql` - All data
- `full_backup.sql` - Complete backup (schema + data)
- `*_data.sql` - Individual table data
- `restore.sh` - Restoration script
- `BACKUP_INFO.md` - Backup metadata

### Backup Location
All backups are stored in `data-export/` directory:
- `data-export/backup_YYYYMMDD_HHMMSS/` - Manual backups
- `data-export/pre_commit_backup_YYYYMMDD_HHMMSS/` - Pre-commit backups
- `data-export/latest_backup/` - Symlink to latest backup

## Safety Features

### Data Protection
- Multiple backup formats for different restoration needs
- Individual table exports for selective restoration
- Automatic backup before destructive operations
- Clear warnings before restoration

### Error Handling
- Pre-commit hooks prevent commits if backup fails
- Restoration scripts include safety checks
- Clear error messages and status reporting

## Best Practices

### Before Major Changes
1. Create a named backup: `./scripts/backup-manager.sh create "before-migration"`
2. Test your changes
3. If something goes wrong, restore: `./scripts/backup-manager.sh restore "before-migration"`

### Regular Maintenance
1. Check backup status: `./scripts/backup-manager.sh status`
2. Clean old backups: `./scripts/backup-manager.sh clean 30`
3. Verify latest backup is recent

### Emergency Recovery
1. List available backups: `./scripts/backup-manager.sh list`
2. Restore from latest: `./scripts/backup-manager.sh latest`
3. Or restore specific backup: `./scripts/backup-manager.sh restore "backup_name"`

## Troubleshooting

### Backup Fails
- Ensure Supabase is running: `docker ps | grep supabase`
- Check disk space: `df -h`
- Verify permissions: `ls -la scripts/`

### Restoration Fails
- Check Supabase is running
- Verify backup files exist
- Check database connection

### Pre-commit Hook Not Working
- Verify hook is executable: `ls -la .git/hooks/pre-commit`
- Check git configuration
- Test manually: `./scripts/backup-before-commit.sh`

## Configuration

### Backup Directory
Default: `data-export/`
Change by modifying `BACKUP_DIR` in scripts

### Retention Policy
Default: 30 days
Change with: `./scripts/backup-manager.sh clean N`

### Pre-commit Behavior
- Automatically runs for migration files
- Can be disabled by removing `.git/hooks/pre-commit`
- Can be run manually: `./scripts/backup-before-commit.sh`
EOF

echo -e "${GREEN}✅ Backup system setup completed!${NC}"
echo ""
echo -e "${BLUE}📚 Documentation created: BACKUP_SYSTEM.md${NC}"
echo -e "${BLUE}🔧 Pre-commit hook installed: .git/hooks/pre-commit${NC}"
echo -e "${BLUE}📁 Backup directory: data-export/${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the system: ./scripts/backup-manager.sh status"
echo "2. Create a test backup: ./scripts/backup-manager.sh create test"
echo "3. Read the documentation: cat BACKUP_SYSTEM.md"
echo ""
echo -e "${GREEN}🎉 Your data is now protected!${NC}"
