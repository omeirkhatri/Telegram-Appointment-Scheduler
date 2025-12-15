# Dispatcher Quick Reference Guide
**Driver Assignment Overhaul - Quick Reference**

## Assignment Modes

### Assign Now
- **When**: Same-day, urgent, or confirmed driver availability
- **Result**: Driver required immediately, segments scheduled
- **Use for**: Simple single-driver scenarios, patient needs confirmation

### Assign Later
- **When**: Future appointments (24+ hours), uncertain availability
- **Result**: Segments go to unassigned queue, driver assigned later
- **Use for**: Complex scenarios, bulk appointments, review options

## Capacity Planner Quick Actions

### Daily Workflow
1. **Start Day**: Review unassigned queue and escalation alerts
2. **Check Metrics**: View insights panel for performance indicators
3. **Assign Segments**: Drag from queue to driver lanes
4. **Monitor**: Watch for new escalations and conflicts

### Drag & Drop Assignment
- **From**: Unassigned queue (center pane)
- **To**: Driver lanes (left pane)
- **Visual Feedback**: Color-coded segments and conflict warnings
- **Override**: Use when deviating from recommendations

### Time Windows
- **12h**: Current shift
- **24h**: Today
- **48h**: Today + tomorrow
- **72h**: 3-day view
- **7d**: Weekly view
- **Custom**: Any date range

## Driver Recommendations

### Score Ranges
- **90-100**: Excellent match (follow recommendation)
- **80-89**: Good match (usually follow)
- **70-79**: Acceptable (consider alternatives)
- **60-69**: Poor match (override likely needed)
- **Below 60**: Not recommended (override required)

### Override Reasons
- Patient preference
- Schedule conflict
- Public transport chosen
- Vehicle mismatch
- Driver request
- Operational requirement
- Other (with note)

## Escalation Management

### Six-Hour Rule
- **Trigger**: Segments unassigned 6 hours before start
- **Visual**: Red highlighting in unassigned queue
- **Action**: Assign driver or escalate to duty manager

### Severity Levels
- **Critical**: 2+ hours past deadline (immediate action)
- **High**: 1-2 hours past deadline (urgent)
- **Medium**: 30 minutes to 1 hour (attention needed)
- **Low**: Approaching deadline (monitor)

### Response Process
1. **Acknowledge**: Click escalation alert
2. **Assign**: Find available driver or alternative
3. **Escalate**: Contact duty manager if no solution
4. **Document**: Record resolution and lessons learned

## Common Scenarios

### Same-Day Appointment
1. Select "Assign Now" mode
2. Choose available driver
3. Verify timing and locations
4. Save appointment

### Future Appointment
1. Select "Assign Later" mode
2. Save without driver selection
3. Use capacity planner later to assign
4. Monitor for escalations

### Driver Unavailable
1. Check capacity planner for alternatives
2. Use driver recommendations
3. Override with reason if needed
4. Update patient if necessary

### Escalation Alert
1. Review segment in unassigned queue
2. Check driver availability
3. Assign driver or escalate
4. Acknowledge alert

## Keyboard Shortcuts

### Navigation
- **Ctrl/Cmd + 1**: Appointment form
- **Ctrl/Cmd + 2**: Capacity planner
- **Ctrl/Cmd + 3**: Drivers board
- **Ctrl/Cmd + 4**: Metrics dashboard

### Actions
- **Space**: Toggle assignment mode
- **Enter**: Save appointment
- **Esc**: Cancel/close modal
- **F5**: Refresh data

## Troubleshooting

### Common Issues
- **Assignment mode not showing**: Check feature flag enabled
- **Capacity planner empty**: Verify date range and filters
- **Recommendations missing**: Check assistive engine enabled
- **Escalations not working**: Verify escalation monitoring active

### Quick Fixes
- **Refresh page**: F5 or browser refresh
- **Check filters**: Clear all filters and reapply
- **Verify permissions**: Ensure proper access rights
- **Contact support**: For persistent issues

## Performance Targets

### KPIs to Monitor
- **Override Rate**: < 30%
- **Escalation Rate**: < 5%
- **Assignment Time**: < 30 minutes average
- **User Satisfaction**: > 4.0/5.0

### Daily Goals
- **Zero Critical Escalations**: Assign before 2-hour deadline
- **High Recommendation Acceptance**: Follow 80+ score recommendations
- **Balanced Workload**: Distribute segments evenly across drivers
- **Complete Documentation**: Record all overrides with reasons

---

**Need Help?**
- **Technical Support**: [Contact Information]
- **Training Support**: [Contact Information]
- **Emergency Escalation**: [Contact Information]

*Last Updated: [Current Date]*
*Version: 2.0 - Driver Assignment Overhaul*

