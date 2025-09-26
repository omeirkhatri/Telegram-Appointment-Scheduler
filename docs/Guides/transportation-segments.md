# Transportation Segments Operations Guide

## Overview

This guide provides comprehensive instructions for rolling out, managing, and operating the Transportation Segments feature in the BestDOC Appointment Scheduler. The feature enables dispatchers to create structured transportation segments for driver scheduling, replacing the single-driver assignment model.

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Pilot Rollout Plan](#pilot-rollout-plan)
3. [Environment Configuration](#environment-configuration)
4. [Dispatcher Training](#dispatcher-training)
5. [Fallback Procedures](#fallback-procedures)
6. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
7. [Performance Optimization](#performance-optimization)
8. [Rollout Checklist](#rollout-checklist)

## Feature Overview

### What are Transportation Segments?

Transportation Segments allow dispatchers to break down appointments into structured transportation legs:

- **Pickup Segments**: Driver picks up patient from location A
- **Dropoff Segments**: Driver drops off patient at location B
- **Stay-with-Staff Segments**: Driver remains with patient during appointment
- **Metro Assist Segments**: Driver helps with public transportation
- **Custom Segments**: Specialized transportation needs

### Key Benefits

- **Reduced Confusion**: Clear separation of pickup vs. dropoff responsibilities
- **Better Driver Utilization**: Different drivers can handle different legs
- **Improved Scheduling**: Travel time calculations and conflict detection
- **Enhanced Visibility**: Driver board shows all segments per driver
- **Audit Trail**: Track manual overrides and scheduling decisions

## Pilot Rollout Plan

### Phase 1: Infrastructure Setup (Week 1)

1. **Database Migration**
   ```bash
   # Run the transportation segments migration
   npx supabase db push

   # Verify migration success
   npx supabase db diff
   ```

2. **Environment Configuration**
   ```bash
   # Update environment variables
   cp config/env.production.template .env

   # Enable core feature (disabled by default)
   TRANSPORTATION_SEGMENTS_ENABLED=true
   ```

3. **Feature Flag Activation**
   - Enable `TRANSPORTATION_SEGMENTS_ENABLED=true`
   - Keep all sub-features disabled initially
   - Test API endpoints are accessible

### Phase 2: Core Functionality (Week 2)

1. **Enable Basic Features**
   ```bash
   # Enable core transportation segments functionality
   TRANSPORTATION_SEGMENTS_ENABLED=true
   TRANSPORTATION_SEGMENTS_UI_ENABLED=true
   ```

2. **Test Core Operations**
   - Create transportation segments via API
   - Verify database storage
   - Test basic CRUD operations

### Phase 3: UI Integration (Week 3)

1. **Enable UI Components**
   ```bash
   # Enable transportation segments UI
   TRANSPORTATION_SEGMENTS_UI_ENABLED=true
   TRANSPORTATION_SEGMENTS_MAPS_ENABLED=true
   ```

2. **Dispatcher Training**
   - Conduct training sessions
   - Test with sample appointments
   - Gather feedback and iterate

### Phase 4: Advanced Features (Week 4)

1. **Enable Advanced Features**
   ```bash
   # Enable calendar integration
   TRANSPORTATION_SEGMENTS_CALENDAR_ENABLED=true

   # Enable notifications
   TRANSPORTATION_SEGMENTS_NOTIFICATIONS_ENABLED=true

   # Enable driver board
   TRANSPORTATION_SEGMENTS_DRIVER_BOARD_ENABLED=true
   ```

2. **Full Integration Testing**
   - Test calendar event creation
   - Verify Telegram notifications
   - Test driver board functionality

### Phase 5: Production Rollout (Week 5)

1. **Enable All Features**
   ```bash
   # Enable all transportation segments features
   TRANSPORTATION_SEGMENTS_ENABLED=true
   TRANSPORTATION_SEGMENTS_UI_ENABLED=true
   TRANSPORTATION_SEGMENTS_CALENDAR_ENABLED=true
   TRANSPORTATION_SEGMENTS_NOTIFICATIONS_ENABLED=true
   TRANSPORTATION_SEGMENTS_MAPS_ENABLED=true
   TRANSPORTATION_SEGMENTS_DRIVER_BOARD_ENABLED=true
   TRANSPORTATION_SEGMENTS_REPORTING_ENABLED=true
   TRANSPORTATION_SEGMENTS_OVERRIDES_ENABLED=true
   TRANSPORTATION_SEGMENTS_TRAVEL_TIME_ENABLED=true
   ```

2. **Monitor Performance**
   - Track system performance
   - Monitor error rates
   - Collect user feedback

## Environment Configuration

### Development Environment

```bash
# Development configuration
TRANSPORTATION_SEGMENTS_ENABLED=false
TRANSPORTATION_SEGMENTS_UI_ENABLED=false
TRANSPORTATION_SEGMENTS_CALENDAR_ENABLED=false
TRANSPORTATION_SEGMENTS_NOTIFICATIONS_ENABLED=false
TRANSPORTATION_SEGMENTS_MAPS_ENABLED=false
TRANSPORTATION_SEGMENTS_DRIVER_BOARD_ENABLED=false
TRANSPORTATION_SEGMENTS_REPORTING_ENABLED=false
TRANSPORTATION_SEGMENTS_OVERRIDES_ENABLED=false
TRANSPORTATION_SEGMENTS_TRAVEL_TIME_ENABLED=false

# Configuration settings
TRANSPORTATION_SEGMENTS_DEFAULT_BUFFER_MINUTES=20
TRANSPORTATION_SEGMENTS_MIN_TRAVEL_GAP_MINUTES=15
TRANSPORTATION_SEGMENTS_MAX_DAILY_SEGMENTS_PER_DRIVER=20
TRANSPORTATION_SEGMENTS_OVERRIDE_REMINDER_HOURS=2

# Google Maps Distance Matrix (disabled in development)
GOOGLE_MAPS_DISTANCE_MATRIX_ENABLED=false
GOOGLE_MAPS_DISTANCE_MATRIX_QUOTA_LIMIT=1000
GOOGLE_MAPS_DISTANCE_MATRIX_CACHE_TTL_HOURS=1
GOOGLE_MAPS_DISTANCE_MATRIX_FALLBACK_ENABLED=true
```

### Production Environment

```bash
# Production configuration (enable gradually)
TRANSPORTATION_SEGMENTS_ENABLED=true
TRANSPORTATION_SEGMENTS_UI_ENABLED=true
TRANSPORTATION_SEGMENTS_CALENDAR_ENABLED=true
TRANSPORTATION_SEGMENTS_NOTIFICATIONS_ENABLED=true
TRANSPORTATION_SEGMENTS_MAPS_ENABLED=true
TRANSPORTATION_SEGMENTS_DRIVER_BOARD_ENABLED=true
TRANSPORTATION_SEGMENTS_REPORTING_ENABLED=true
TRANSPORTATION_SEGMENTS_OVERRIDES_ENABLED=true
TRANSPORTATION_SEGMENTS_TRAVEL_TIME_ENABLED=true

# Configuration settings
TRANSPORTATION_SEGMENTS_DEFAULT_BUFFER_MINUTES=20
TRANSPORTATION_SEGMENTS_MIN_TRAVEL_GAP_MINUTES=15
TRANSPORTATION_SEGMENTS_MAX_DAILY_SEGMENTS_PER_DRIVER=20
TRANSPORTATION_SEGMENTS_OVERRIDE_REMINDER_HOURS=2

# Google Maps Distance Matrix (enabled in production)
GOOGLE_MAPS_DISTANCE_MATRIX_ENABLED=true
GOOGLE_MAPS_DISTANCE_MATRIX_QUOTA_LIMIT=10000
GOOGLE_MAPS_DISTANCE_MATRIX_CACHE_TTL_HOURS=24
GOOGLE_MAPS_DISTANCE_MATRIX_FALLBACK_ENABLED=true
```

## Dispatcher Training

### Training Materials

1. **Feature Overview Presentation**
   - What are transportation segments
   - Benefits over single-driver model
   - When to use segments vs. simple mode

2. **Hands-on Training**
   - Creating transportation segments
   - Assigning drivers to segments
   - Managing segment timelines
   - Using the driver board

3. **Best Practices**
   - Segment naming conventions
   - Buffer time recommendations
   - Conflict resolution strategies

### Training Schedule

**Week 1: Introduction**
- Feature overview (30 minutes)
- Basic segment creation (45 minutes)
- Q&A session (15 minutes)

**Week 2: Advanced Features**
- Driver board usage (30 minutes)
- Calendar integration (30 minutes)
- Override procedures (30 minutes)

**Week 3: Practice Sessions**
- Hands-on practice with sample data
- Real-world scenario exercises
- Troubleshooting common issues

**Week 4: Go-Live Preparation**
- Final review of procedures
- Emergency contact information
- Rollback procedures

### Training Checklist

- [ ] Dispatcher understands segment types
- [ ] Can create basic pickup/dropoff segments
- [ ] Knows how to assign drivers
- [ ] Understands buffer time concepts
- [ ] Can use driver board effectively
- [ ] Knows override procedures
- [ ] Understands fallback to simple mode
- [ ] Can troubleshoot common issues

## Fallback Procedures

### Emergency Rollback

If transportation segments cause critical issues:

1. **Immediate Rollback**
   ```bash
   # Disable all transportation segments features
   TRANSPORTATION_SEGMENTS_ENABLED=false
   TRANSPORTATION_SEGMENTS_UI_ENABLED=false
   TRANSPORTATION_SEGMENTS_CALENDAR_ENABLED=false
   TRANSPORTATION_SEGMENTS_NOTIFICATIONS_ENABLED=false
   TRANSPORTATION_SEGMENTS_MAPS_ENABLED=false
   TRANSPORTATION_SEGMENTS_DRIVER_BOARD_ENABLED=false
   TRANSPORTATION_SEGMENTS_REPORTING_ENABLED=false
   TRANSPORTATION_SEGMENTS_OVERRIDES_ENABLED=false
   TRANSPORTATION_SEGMENTS_TRAVEL_TIME_ENABLED=false

   # Restart application
   systemctl restart your-app-service
   ```

2. **Data Migration Back**
   ```sql
   -- If needed, migrate segments back to simple driver assignments
   UPDATE appointments
   SET driver_id = (
     SELECT driver_id
     FROM transportation_segments
     WHERE transportation_segments.appointment_id = appointments.id
     AND segment_type = 'pickup'
     LIMIT 1
   )
   WHERE id IN (
     SELECT appointment_id
     FROM transportation_segments
   );
   ```

### Partial Rollback

If only specific features cause issues:

1. **Disable Problematic Features**
   ```bash
   # Example: Disable travel time calculations if causing performance issues
   TRANSPORTATION_SEGMENTS_TRAVEL_TIME_ENABLED=false
   ```

2. **Monitor System Performance**
   - Check error logs
   - Monitor response times
   - Verify data integrity

### Gradual Rollback

If performance degrades gradually:

1. **Disable Non-Critical Features**
   ```bash
   # Disable reporting and analytics first
   TRANSPORTATION_SEGMENTS_REPORTING_ENABLED=false

   # Then disable travel time calculations
   TRANSPORTATION_SEGMENTS_TRAVEL_TIME_ENABLED=false
   ```

2. **Monitor Impact**
   - Check system performance
   - Verify core functionality
   - Re-enable features gradually

## Monitoring and Troubleshooting

### Key Metrics to Monitor

1. **Performance Metrics**
   - API response times
   - Database query performance
   - Memory usage
   - CPU utilization

2. **Feature Usage Metrics**
   - Segments created per day
   - Driver board usage
   - Override frequency
   - Error rates

3. **Business Metrics**
   - Appointment completion rates
   - Driver utilization
   - Customer satisfaction
   - Dispatcher efficiency

### Common Issues and Solutions

#### Issue: Segments not appearing in UI
**Symptoms**: Transportation segments created but not visible in appointment details
**Solution**:
1. Check `TRANSPORTATION_SEGMENTS_UI_ENABLED=true`
2. Verify database connection
3. Check browser console for errors
4. Clear browser cache

#### Issue: Calendar events not created
**Symptoms**: Segments created but no calendar events
**Solution**:
1. Check `TRANSPORTATION_SEGMENTS_CALENDAR_ENABLED=true`
2. Verify Google Calendar service account
3. Check calendar API permissions
4. Review error logs

#### Issue: Telegram notifications not sent
**Symptoms**: Segments created but no notifications
**Solution**:
1. Check `TRANSPORTATION_SEGMENTS_NOTIFICATIONS_ENABLED=true`
2. Verify Telegram bot token
3. Check notification service status
4. Review notification logs

#### Issue: Driver board not loading
**Symptoms**: Driver board page shows error or empty
**Solution**:
1. Check `TRANSPORTATION_SEGMENTS_DRIVER_BOARD_ENABLED=true`
2. Verify driver data exists
3. Check API endpoints
4. Review browser console

#### Issue: Travel time calculations failing
**Symptoms**: Travel time shows "N/A" or errors
**Solution**:
1. Check `TRANSPORTATION_SEGMENTS_TRAVEL_TIME_ENABLED=true`
2. Verify Google Maps API key
3. Check API quota limits
4. Review distance matrix logs

### Troubleshooting Commands

```bash
# Check feature flag status
curl -X GET "http://localhost:3000/api/transportation-segments/status"

# Test API endpoints
curl -X GET "http://localhost:3000/api/transportation-segments"

# Check database connectivity
npx supabase db ping

# View application logs
tail -f logs/application.log

# Check system resources
htop
df -h
free -m
```

## Performance Optimization

### Database Optimization

1. **Index Optimization**
   ```sql
   -- Ensure proper indexes exist
   CREATE INDEX IF NOT EXISTS idx_transportation_segments_appointment_id
   ON transportation_segments(appointment_id);

   CREATE INDEX IF NOT EXISTS idx_transportation_segments_driver_id
   ON transportation_segments(driver_id);

   CREATE INDEX IF NOT EXISTS idx_transportation_segments_planned_start
   ON transportation_segments(planned_start);
   ```

2. **Query Optimization**
   - Use proper WHERE clauses
   - Limit result sets
   - Use pagination for large datasets

### API Optimization

1. **Caching Strategy**
   - Cache frequently accessed data
   - Use Redis for session storage
   - Implement API response caching

2. **Rate Limiting**
   - Implement rate limiting for API endpoints
   - Monitor API usage patterns
   - Set appropriate limits

### Google Maps API Optimization

1. **Quota Management**
   - Monitor API usage
   - Implement caching
   - Use fallback mechanisms

2. **Batch Requests**
   - Combine multiple requests
   - Use batch processing
   - Implement request queuing

## Rollout Checklist

### Pre-Rollout

- [ ] Database migration completed successfully
- [ ] Environment variables configured
- [ ] Feature flags set appropriately
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Training materials prepared
- [ ] Dispatcher training completed
- [ ] Monitoring systems in place
- [ ] Rollback procedures tested
- [ ] Emergency contacts established

### During Rollout

- [ ] Monitor system performance
- [ ] Check error rates
- [ ] Verify feature functionality
- [ ] Monitor user feedback
- [ ] Track key metrics
- [ ] Document any issues
- [ ] Provide user support
- [ ] Adjust configuration as needed

### Post-Rollout

- [ ] Performance metrics within acceptable ranges
- [ ] Error rates below threshold
- [ ] User satisfaction positive
- [ ] All features working correctly
- [ ] Documentation updated
- [ ] Lessons learned documented
- [ ] Future improvements identified
- [ ] Success metrics achieved

## Support and Maintenance

### Regular Maintenance Tasks

1. **Daily**
   - Check error logs
   - Monitor performance metrics
   - Verify feature functionality

2. **Weekly**
   - Review usage statistics
   - Check database performance
   - Update documentation

3. **Monthly**
   - Analyze performance trends
   - Review user feedback
   - Plan improvements

### Emergency Procedures

1. **Critical Issues**
   - Immediate rollback if needed
   - Notify stakeholders
   - Document incident
   - Post-mortem analysis

2. **Performance Issues**
   - Monitor system resources
   - Adjust configuration
   - Scale resources if needed
   - Optimize queries

### Contact Information

- **Technical Support**: [Your technical support contact]
- **Emergency Escalation**: [Your emergency contact]
- **Product Owner**: [Your product owner contact]
- **Development Team**: [Your development team contact]

## Conclusion

This operations guide provides comprehensive instructions for successfully rolling out and managing the Transportation Segments feature. Follow the phased approach, monitor performance closely, and be prepared to rollback if needed. With proper planning and execution, transportation segments will significantly improve dispatcher efficiency and driver utilization.

For questions or issues not covered in this guide, contact the development team or refer to the technical documentation.
