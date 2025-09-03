# Cloud Migration Guide

This guide provides comprehensive instructions for migrating your MediCare Scheduler application from local development to Supabase Cloud.

## Overview

The cloud migration process involves:
1. **Validation** - Ensuring your local database is ready for migration
2. **Backup** - Creating comprehensive backups of your data
3. **Migration** - Moving your database and configuration to Supabase Cloud
4. **Validation** - Verifying the migration was successful
5. **Rollback** - Reverting to local development if needed

## Prerequisites

Before starting the migration process, ensure you have:

- ✅ Supabase CLI installed (`npm install -g supabase`)
- ✅ Local Supabase running (`npx supabase start`)
- ✅ Complete local development setup
- ✅ Supabase Cloud project created
- ✅ All local data tested and validated

## Quick Start

### 1. Validate Your Local Database

```bash
# Run comprehensive validation
npm run migrate:validate

# Or run specific validations
./scripts/validate-migration.sh --schema-only
./scripts/validate-migration.sh --data-only
```

### 2. Create a Backup

```bash
# Create full backup
npm run migrate:backup

# Or create specific backups
./scripts/backup-data.sh --schema-only
./scripts/backup-data.sh --data-only
```

### 3. Migrate to Cloud

```bash
# Perform full migration
npm run migrate:to-cloud

# Or run specific steps
./scripts/migrate-to-cloud.sh backup
./scripts/migrate-to-cloud.sh validate
```

### 4. Rollback if Needed

```bash
# Rollback failed migration
npm run migrate:rollback

# Or force rollback without confirmation
./scripts/rollback-migration.sh --force
```

## Detailed Migration Process

### Step 1: Pre-Migration Validation

Before migrating, validate your local database:

```bash
./scripts/validate-migration.sh
```

This will check:
- ✅ Database schema completeness
- ✅ Data integrity
- ✅ Storage configuration
- ✅ Environment variables
- ✅ Migration files
- ✅ Required functions and indexes

### Step 2: Create Comprehensive Backup

Create a backup of your local database:

```bash
./scripts/backup-data.sh
```

This creates:
- 📁 Database schema backup
- 📁 Database data backup
- 📁 Full database backup
- 📁 Storage files backup
- 📁 Environment configuration backup
- 📁 Migration files backup
- 📁 Backup manifest

### Step 3: Cloud Project Setup

1. **Create Supabase Cloud Project**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Click "New Project"
   - Choose your organization
   - Enter project details
   - Wait for project creation

2. **Get Project Reference ID**
   - Go to Settings > General
   - Copy the "Reference ID"

### Step 4: Perform Migration

Run the migration script:

```bash
./scripts/migrate-to-cloud.sh
```

The script will:
1. Validate prerequisites
2. Create backup of local database
3. Link to your cloud project
4. Push schema to cloud
5. Migrate data to cloud
6. Update environment variables
7. Validate cloud migration

### Step 5: Post-Migration Validation

After migration, validate the cloud setup:

```bash
# Test your application
npm run dev

# Check cloud database
supabase status --linked
```

## Migration Scripts Reference

### Validation Script

```bash
# Full validation
./scripts/validate-migration.sh

# Specific validations
./scripts/validate-migration.sh --schema-only
./scripts/validate-migration.sh --data-only
./scripts/validate-migration.sh --storage-only
./scripts/validate-migration.sh --env-only
./scripts/validate-migration.sh --migrations-only
```

### Backup Script

```bash
# Full backup
./scripts/backup-data.sh

# Specific backups
./scripts/backup-data.sh --schema-only
./scripts/backup-data.sh --data-only
./scripts/backup-data.sh --no-compress
```

### Migration Script

```bash
# Full migration
./scripts/migrate-to-cloud.sh

# Specific steps
./scripts/migrate-to-cloud.sh backup
./scripts/migrate-to-cloud.sh validate
```

### Restore Script

```bash
# Full restore
./scripts/restore-data.sh

# Specific restores
./scripts/restore-data.sh --schema-only
./scripts/restore-data.sh --data-only
./scripts/restore-data.sh --no-backup
```

### Rollback Script

```bash
# Full rollback
./scripts/rollback-migration.sh

# Specific options
./scripts/rollback-migration.sh --no-backup
./scripts/rollback-migration.sh --no-restore
./scripts/rollback-migration.sh --force
```

## NPM Scripts

For convenience, the following npm scripts are available:

```bash
# Migration scripts
npm run migrate:validate    # Validate local database
npm run migrate:backup      # Create backup
npm run migrate:restore     # Restore from backup
npm run migrate:to-cloud    # Migrate to cloud
npm run migrate:rollback    # Rollback migration

# Docker scripts
npm run docker:setup        # Set up Docker environment
npm run docker:start        # Start Docker services
npm run docker:stop         # Stop Docker services
npm run docker:status       # Check Docker status
npm run docker:logs         # View Docker logs
npm run docker:cleanup      # Clean up Docker resources
```

## Environment Configuration

### Local Development

```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_key
TZ=Asia/Dubai
```

### Cloud Production

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_cloud_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_cloud_service_key
TZ=Asia/Dubai
```

## Troubleshooting

### Common Issues

#### 1. Migration Validation Fails

**Problem**: Validation script reports errors
**Solution**:
- Fix the reported issues
- Ensure all required tables and functions exist
- Run validation again

#### 2. Backup Creation Fails

**Problem**: Backup script fails to create backup
**Solution**:
- Ensure local Supabase is running
- Check disk space
- Verify database permissions

#### 3. Cloud Linking Fails

**Problem**: Cannot link to cloud project
**Solution**:
- Verify project reference ID
- Check Supabase CLI version
- Ensure you have project access

#### 4. Data Migration Fails

**Problem**: Data fails to migrate to cloud
**Solution**:
- Check network connectivity
- Verify cloud database permissions
- Review error logs

#### 5. Environment Variables Not Updated

**Problem**: Environment variables not updated after migration
**Solution**:
- Manually update .env.local
- Restart your application
- Verify cloud project credentials

### Recovery Procedures

#### If Migration Fails

1. **Stop the migration process**
2. **Run rollback script**:
   ```bash
   ./scripts/rollback-migration.sh
   ```
3. **Fix the issues**
4. **Retry migration**

#### If Rollback Fails

1. **Manually unlink from cloud**:
   ```bash
   supabase unlink
   ```
2. **Restore environment file**:
   ```bash
   cp .env.local.backup.* .env.local
   ```
3. **Restart local services**:
   ```bash
   supabase start
   ```

## Best Practices

### Before Migration

1. **Test thoroughly** - Ensure your local application works perfectly
2. **Create backups** - Always create backups before migration
3. **Validate data** - Run validation scripts to check data integrity
4. **Document issues** - Note any known issues or workarounds

### During Migration

1. **Monitor progress** - Watch the migration script output
2. **Don't interrupt** - Let the migration complete
3. **Take notes** - Document any errors or warnings

### After Migration

1. **Test immediately** - Verify your application works
2. **Monitor performance** - Check for any performance issues
3. **Update documentation** - Update any deployment docs
4. **Set up monitoring** - Configure cloud monitoring

## Security Considerations

### Environment Variables

- ✅ Never commit `.env.local` to version control
- ✅ Use different keys for development and production
- ✅ Rotate keys regularly
- ✅ Use environment-specific configurations

### Database Security

- ✅ Enable Row Level Security (RLS) in production
- ✅ Review and test RLS policies
- ✅ Use least-privilege access
- ✅ Monitor database access

### API Security

- ✅ Use HTTPS in production
- ✅ Implement rate limiting
- ✅ Validate all inputs
- ✅ Use secure authentication

## Monitoring and Maintenance

### Cloud Monitoring

1. **Set up Supabase monitoring**
2. **Configure alerts for critical issues**
3. **Monitor database performance**
4. **Track API usage**

### Regular Maintenance

1. **Backup cloud database regularly**
2. **Monitor storage usage**
3. **Review and update security policies**
4. **Keep dependencies updated**

## Support

If you encounter issues during migration:

1. **Check the troubleshooting section above**
2. **Review the script logs for detailed error messages**
3. **Consult the Supabase documentation**
4. **Check the project's GitHub issues**

## Next Steps

After successful migration:

1. **Deploy your application** to production
2. **Set up monitoring and alerts**
3. **Configure automated backups**
4. **Update your deployment documentation**
5. **Train your team on cloud operations**

---

**Important**: Always test your migration in a staging environment before migrating production data.
