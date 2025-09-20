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
