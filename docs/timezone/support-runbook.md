# Timezone System Support Runbook (Task 7.3)

This runbook provides comprehensive troubleshooting steps, escalation paths, and operational procedures for the timezone system in the Best DOC appointment scheduler.

## Table of Contents

1. [System Overview](#system-overview)
2. [Monitoring & Alerting](#monitoring--alerting)
3. [Common Issues & Solutions](#common-issues--solutions)
4. [Escalation Procedures](#escalation-procedures)
5. [Auditing Tools](#auditing-tools)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Emergency Procedures](#emergency-procedures)

## System Overview

The timezone system consists of several key components:

- **Organization Settings**: Default timezone for the organization
- **Location Settings**: Per-location timezone overrides
- **Timezone Resolver**: Core logic for resolving timezone context
- **Audit System**: Tracks all timezone changes
- **Monitoring**: Real-time health monitoring and alerting

### Key Files

- `src/utils/timezone.ts` - Core timezone resolver
- `src/lib/timezoneArtifacts.ts` - Helper utilities
- `src/services/timezoneContextService.ts` - Cached lookups
- `scripts/comprehensive-timezone-backfill.js` - Data migration tool
- `scripts/timezone-monitoring-dashboard.js` - Monitoring dashboard

## Monitoring & Alerting

### Health Checks

The system provides several health indicators:

1. **Resolver Error Rate**: Should be < 1%
2. **Fallback Usage**: Should be < 20%
3. **Legacy Usage**: Should decrease over time
4. **Timezone Changes**: Monitor for unusual frequency

### Monitoring Commands

```bash
# Start real-time monitoring
node scripts/timezone-monitoring-dashboard.js --realtime

# Generate health report
node scripts/timezone-monitoring-dashboard.js --mode report

# Export monitoring data
node scripts/timezone-monitoring-dashboard.js --mode export --format csv
```

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Error Rate | > 1% | > 5% | Investigate resolver issues |
| Fallback Usage | > 20% | > 50% | Check timezone configuration |
| Legacy Usage | > 30% | > 60% | Accelerate migration |
| Timezone Changes | > 5/day | > 10/day | Review change procedures |

## Common Issues & Solutions

### 1. High Resolver Error Rate

**Symptoms:**
- Error logs showing timezone resolution failures
- Appointments displaying incorrect times
- User complaints about scheduling issues

**Diagnosis:**
```bash
# Check recent errors
node scripts/timezone-monitoring-dashboard.js --mode report

# Check application logs
psql -c "SELECT * FROM application_logs WHERE message ILIKE '%timezone%' AND level = 'error' ORDER BY created_at DESC LIMIT 10;"
```

**Solutions:**
1. Verify organization and location timezone settings
2. Check for invalid timezone identifiers
3. Review resolver fallback chain configuration
4. Restart application services if needed

### 2. Excessive Fallback Usage

**Symptoms:**
- High fallback usage in monitoring reports
- Inconsistent timezone resolution
- Performance degradation

**Diagnosis:**
```bash
# Check fallback usage patterns
node scripts/timezone-monitoring-dashboard.js --mode report --format json | jq '.metrics.fallbackUsage'
```

**Solutions:**
1. Verify location timezone configuration
2. Check organization default timezone
3. Review appointment location assignments
4. Update missing timezone metadata

### 3. Legacy Timezone Usage

**Symptoms:**
- High legacy usage in reports
- Hard-coded timezone references in logs
- Inconsistent behavior across components

**Diagnosis:**
```bash
# Search for hard-coded timezone references
grep -r "Asia/Dubai" src/ --exclude-dir=node_modules
grep -r "Europe/London" src/ --exclude-dir=node_modules
```

**Solutions:**
1. Run comprehensive backfill script
2. Update remaining hard-coded references
3. Verify resolver adoption across services
4. Run static analysis checks

### 4. Timezone Change Issues

**Symptoms:**
- Unexpected timezone changes in audit log
- User complaints about timezone updates
- Configuration inconsistencies

**Diagnosis:**
```bash
# Check recent timezone changes
psql -c "SELECT * FROM timezone_change_audit ORDER BY changed_at DESC LIMIT 10;"
```

**Solutions:**
1. Verify change authorization
2. Check for automated system changes
3. Review change procedures
4. Implement additional validation

## Escalation Procedures

### Level 1: Basic Troubleshooting (0-30 minutes)

**Actions:**
1. Check monitoring dashboard
2. Review recent error logs
3. Verify basic configuration
4. Restart affected services

**Tools:**
- Monitoring dashboard
- Application logs
- Basic configuration checks

### Level 2: Advanced Troubleshooting (30 minutes - 2 hours)

**Actions:**
1. Run comprehensive diagnostics
2. Check database integrity
3. Analyze performance metrics
4. Review system configuration

**Tools:**
- Comprehensive backfill script
- Database queries
- Performance monitoring
- Configuration validation

### Level 3: System Recovery (2+ hours)

**Actions:**
1. Implement emergency fixes
2. Rollback problematic changes
3. Restore from backups if needed
4. Coordinate with development team

**Tools:**
- Emergency procedures
- Backup restoration
- Development team coordination
- System rollback procedures

## Auditing Tools

### 1. Timezone Change Audit

```sql
-- View all timezone changes
SELECT 
    entity_type,
    entity_id,
    previous_timezone,
    new_timezone,
    changed_by,
    changed_at,
    change_reason
FROM timezone_change_audit
ORDER BY changed_at DESC;

-- Changes by entity
SELECT 
    entity_type,
    entity_id,
    COUNT(*) as change_count,
    MAX(changed_at) as last_change
FROM timezone_change_audit
GROUP BY entity_type, entity_id
ORDER BY change_count DESC;
```

### 2. Resolver Performance Audit

```sql
-- Performance metrics
SELECT 
    metric_name,
    AVG(value) as avg_value,
    MAX(value) as max_value,
    COUNT(*) as sample_count
FROM performance_metrics
WHERE metric_name ILIKE '%timezone%' OR metric_name ILIKE '%resolver%'
GROUP BY metric_name
ORDER BY avg_value DESC;
```

### 3. Data Integrity Audit

```sql
-- Appointments with missing timezone metadata
SELECT COUNT(*) as missing_metadata
FROM appointments
WHERE custom_fields->>'timezone_metadata' IS NULL;

-- Staff with missing timezone preferences
SELECT COUNT(*) as missing_preferences
FROM staff
WHERE custom_fields->>'timezone_metadata' IS NULL;

-- Patients with missing timezone preferences
SELECT COUNT(*) as missing_preferences
FROM patients
WHERE custom_fields->>'timezone_metadata' IS NULL;
```

## Maintenance Procedures

### Daily Maintenance

1. **Check System Health**
   ```bash
   node scripts/timezone-monitoring-dashboard.js --mode report
   ```

2. **Review Error Logs**
   ```bash
   psql -c "SELECT COUNT(*) FROM application_logs WHERE level = 'error' AND created_at > NOW() - INTERVAL '24 hours';"
   ```

3. **Verify Configuration**
   ```bash
   psql -c "SELECT * FROM organization_settings;"
   psql -c "SELECT * FROM locations WHERE is_active = true;"
   ```

### Weekly Maintenance

1. **Run Comprehensive Audit**
   ```bash
   node scripts/comprehensive-timezone-backfill.js --tables appointments,staff,patients --limit 1000
   ```

2. **Check Performance Metrics**
   ```bash
   node scripts/timezone-monitoring-dashboard.js --mode export --format csv
   ```

3. **Review Timezone Changes**
   ```bash
   psql -c "SELECT * FROM timezone_change_audit WHERE changed_at > NOW() - INTERVAL '7 days';"
   ```

### Monthly Maintenance

1. **Full System Audit**
   ```bash
   node scripts/comprehensive-timezone-backfill.js --execute --tables appointments,staff,patients
   ```

2. **Performance Analysis**
   - Review performance trends
   - Identify optimization opportunities
   - Update monitoring thresholds

3. **Documentation Review**
   - Update runbook procedures
   - Review escalation paths
   - Update contact information

## Emergency Procedures

### 1. System-Wide Timezone Failure

**Immediate Actions:**
1. Check monitoring dashboard for errors
2. Review recent system changes
3. Verify database connectivity
4. Check application service status

**Recovery Steps:**
1. Restart application services
2. Verify timezone configuration
3. Run data integrity checks
4. Monitor system recovery

### 2. Data Corruption

**Immediate Actions:**
1. Stop all timezone-related operations
2. Assess extent of corruption
3. Identify affected data
4. Notify stakeholders

**Recovery Steps:**
1. Restore from latest backup
2. Run comprehensive backfill
3. Verify data integrity
4. Resume normal operations

### 3. Performance Degradation

**Immediate Actions:**
1. Check system resource usage
2. Review recent changes
3. Identify performance bottlenecks
4. Implement temporary fixes

**Recovery Steps:**
1. Optimize resolver performance
2. Update caching strategies
3. Scale system resources
4. Monitor improvement

## Contact Information

### Development Team
- **Lead Developer**: [Contact Information]
- **Database Administrator**: [Contact Information]
- **DevOps Engineer**: [Contact Information]

### Escalation Contacts
- **Technical Lead**: [Contact Information]
- **System Administrator**: [Contact Information]
- **Emergency Contact**: [Contact Information]

### External Resources
- **Supabase Support**: [Support Portal]
- **Timezone Database**: [IANA Time Zone Database]
- **Documentation**: [Internal Wiki]

## Appendix

### A. Configuration Files

- `src/lib/env.ts` - Environment configuration
- `src/utils/timezone.ts` - Resolver configuration
- `supabase/migrations/` - Database schema

### B. Log Locations

- Application logs: `logs/application.log`
- Error logs: `logs/error.log`
- Performance logs: `logs/performance.log`

### C. Backup Locations

- Database backups: `data-export/`
- Configuration backups: `config/backups/`
- Script backups: `scripts/backups/`

---

**Last Updated**: 2025-01-24
**Version**: 1.0
**Maintained By**: Development Team
