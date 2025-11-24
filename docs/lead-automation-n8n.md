# Lead Management n8n Automation Guide

## Overview

This document outlines the n8n automation workflows for the lead management system. These automations will handle lead lifecycle management, notifications, and data enrichment for healthcare services (physiotherapy, nursing, caregiving, etc.).

## Webhook Endpoints

### 1. Lead Created Webhook
**Endpoint:** `/api/webhooks/n8n/lead-created`
**Method:** POST
**Trigger:** When a new lead is created
**Payload:**
```json
{
  "lead_id": "uuid",
  "name": "string",
  "phone": "string",
  "email": "string",
  "service_interested_in": "string",
  "stage": "new",
  "priority": "medium",
  "assigned_to_user_id": "uuid",
  "created_at": "timestamp"
}
```

### 2. Lead Updated Webhook
**Endpoint:** `/api/webhooks/n8n/lead-updated`
**Method:** POST
**Trigger:** When lead data is updated
**Payload:**
```json
{
  "lead_id": "uuid",
  "changes": {
    "field_name": {
      "old_value": "any",
      "new_value": "any"
    }
  },
  "updated_at": "timestamp"
}
```

### 3. Lead Stage Changed Webhook
**Endpoint:** `/api/webhooks/n8n/lead-stage-changed`
**Method:** POST
**Trigger:** When lead stage changes
**Payload:**
```json
{
  "lead_id": "uuid",
  "old_stage": "new",
  "new_stage": "contacted",
  "lead_data": { /* full lead object */ },
  "changed_at": "timestamp"
}
```

### 4. Lead Converted Webhook
**Endpoint:** `/api/webhooks/n8n/lead-converted`
**Method:** POST
**Trigger:** When lead is converted to patient
**Payload:**
```json
{
  "lead_id": "uuid",
  "patient_id": "uuid",
  "conversion_data": {
    "conversion_time": "timestamp",
    "total_days_to_convert": 15,
    "final_stage": "converted"
  }
}
```

### 5. Lead Assigned Webhook
**Endpoint:** `/api/webhooks/n8n/lead-assigned`
**Method:** POST
**Trigger:** When lead is assigned to a user
**Payload:**
```json
{
  "lead_id": "uuid",
  "assigned_to_user_id": "uuid",
  "assigned_by_user_id": "uuid",
  "assigned_at": "timestamp"
}
```

### 6. Stale Leads Check Webhook
**Endpoint:** `/api/webhooks/n8n/lead-stale`
**Method:** POST
**Trigger:** Scheduled check for stale leads
**Payload:**
```json
{
  "stale_leads": [
    {
      "lead_id": "uuid",
      "name": "string",
      "days_since_last_contact": 8,
      "assigned_to_user_id": "uuid"
    }
  ],
  "check_time": "timestamp"
}
```

## n8n Workflows

### 1. New Lead Auto-Assignment

**Purpose:** Automatically assign new leads to team members based on workload and service type.

**Nodes:**
1. **Webhook Trigger** - Listen to `/api/webhooks/n8n/lead-created`
2. **Supabase Query** - Get current team workload
3. **Function Node** - Calculate assignment logic
4. **Supabase Update** - Update lead assignment
5. **Telegram/WhatsApp** - Notify assigned user

**Assignment Logic:**
```javascript
// Function node logic
const serviceType = $input.first().json.service_interested_in;
const teamWorkload = $input.first().json.team_workload;

// Assign based on service type and current workload
if (serviceType.includes('physio')) {
  return { assigned_to: 'physio_specialist_id' };
} else if (serviceType.includes('nanny')) {
  return { assigned_to: 'nanny_coordinator_id' };
} else {
  // Assign to person with least leads
  const leastBusy = teamWorkload.reduce((min, member) =>
    member.lead_count < min.lead_count ? member : min
  );
  return { assigned_to: leastBusy.user_id };
}
```

### 2. Follow-up Reminders

**Purpose:** Send reminders for leads that haven't been contacted in 7+ days.

**Nodes:**
1. **Schedule Trigger** - Daily at 9 AM
2. **Supabase Query** - Get stale leads (7+ days)
3. **Split In Batches** - Process in groups of 10
4. **Telegram/WhatsApp** - Send reminder to assigned user
5. **Supabase Update** - Mark reminder sent

**Message Template:**
```
🚨 Follow-up Reminder

You have {{ $json.count }} leads that need follow-up:

{{ $json.leads.map(lead => `• ${lead.name} - ${lead.phone} (${lead.days_since_contact} days)`).join('\n') }}

Please contact them today to maintain conversion rates.
```

### 3. Lead Scoring Automation

**Purpose:** Automatically calculate conversion probability based on engagement.

**Nodes:**
1. **Webhook Trigger** - Listen to lead updates
2. **Function Node** - Calculate score
3. **Supabase Update** - Update conversion probability

**Scoring Algorithm:**
```javascript
// Function node logic
const lead = $input.first().json.lead_data;
let score = 50; // Base score

// Stage-based scoring
const stageScores = {
  'new': 20,
  'contacted': 40,
  'quoted': 60,
  'qualified': 80,
  'not_qualified': 5,
  'converted': 100
};
score = stageScores[lead.stage] || 50;

// Engagement scoring
if (lead.notes_count > 0) score += 10;
if (lead.quotes_count > 0) score += 15;
if (lead.activities_count > 3) score += 10;

// Time-based scoring
const daysSinceContact = Math.floor((Date.now() - new Date(lead.last_contacted_at)) / (1000 * 60 * 60 * 24));
if (daysSinceContact > 14) score -= 20;
if (daysSinceContact < 3) score += 10;

// Service type scoring
if (lead.service_interested_in?.includes('urgent')) score += 15;

return { conversion_probability: Math.max(0, Math.min(100, score)) };
```

### 4. WhatsApp Template Messages

**Purpose:** Send personalized WhatsApp messages when lead stage changes.

**Nodes:**
1. **Webhook Trigger** - Listen to stage changes
2. **Function Node** - Generate message template
3. **WhatsApp Business API** - Send message

**Message Templates:**
```javascript
// Function node logic
const lead = $input.first().json.lead_data;
const newStage = $input.first().json.new_stage;

const templates = {
  'contacted': `Hi ${lead.name}! 👋

Thank you for your interest in our ${lead.service_interested_in} services.

I'm calling to discuss your requirements and answer any questions you might have.

When would be a good time to speak?`,

  'quoted': `Hi ${lead.name}! 💰

I've prepared a personalized quote for your ${lead.service_interested_in} needs.

The quote includes:
• Detailed service breakdown
• Competitive pricing
• Flexible scheduling options

Would you like to review it together?`,

  'qualified': `Hi ${lead.name}! ⭐

Great news! Based on our discussion, you're a perfect fit for our ${lead.service_interested_in} services.

Next steps:
• Finalize service details
• Schedule start date
• Complete onboarding

Ready to move forward?`
};

return { message: templates[newStage] || 'Thank you for your interest!' };
```

### 5. Lost Lead Recovery

**Purpose:** Weekly digest of leads inactive for 30+ days with reactivation suggestions.

**Nodes:**
1. **Schedule Trigger** - Weekly on Monday 10 AM
2. **Supabase Query** - Get lost leads (30+ days inactive)
3. **Function Node** - Categorize by reason
4. **Email/Telegram** - Send digest to manager
5. **Supabase Update** - Mark digest sent

**Recovery Categories:**
```javascript
// Function node logic
const lostLeads = $input.first().json.lost_leads;

const categories = {
  'no_response': [],
  'price_objection': [],
  'timing_issue': [],
  'competitor': [],
  'other': []
};

lostLeads.forEach(lead => {
  if (lead.rejection_reason) {
    const reason = lead.rejection_reason.toLowerCase();
    if (reason.includes('price') || reason.includes('expensive')) {
      categories.price_objection.push(lead);
    } else if (reason.includes('timing') || reason.includes('later')) {
      categories.timing_issue.push(lead);
    } else if (reason.includes('competitor') || reason.includes('other')) {
      categories.competitor.push(lead);
    } else {
      categories.other.push(lead);
    }
  } else {
    categories.no_response.push(lead);
  }
});

return { categories };
```

### 6. Daily Lead Digest

**Purpose:** Morning summary of new leads and follow-ups needed.

**Nodes:**
1. **Schedule Trigger** - Daily at 8 AM
2. **Supabase Query** - Get yesterday's new leads + today's follow-ups
3. **Function Node** - Format digest
4. **Telegram/Email** - Send to team

**Digest Format:**
```
📊 Daily Lead Digest - {{ new Date().toLocaleDateString() }}

🆕 New Leads ({{ $json.new_leads.length }}):
{{ $json.new_leads.map(lead => `• ${lead.name} - ${lead.service_interested_in}`).join('\n') }}

⏰ Follow-ups Needed ({{ $json.follow_ups.length }}):
{{ $json.follow_ups.map(lead => `• ${lead.name} - ${lead.phone} (${lead.days_since_contact} days)`).join('\n') }}

📈 Yesterday's Stats:
• New leads: {{ $json.stats.new_leads }}
• Conversions: {{ $json.stats.conversions }}
• Response rate: {{ $json.stats.response_rate }}%
```

### 7. Response Time Tracking

**Purpose:** Calculate and log first response time for leads.

**Nodes:**
1. **Webhook Trigger** - Listen to lead updates
2. **Function Node** - Calculate response time
3. **Supabase Update** - Store response time

**Response Time Logic:**
```javascript
// Function node logic
const lead = $input.first().json.lead_data;
const changes = $input.first().json.changes;

// Check if this is the first contact
if (changes.stage && changes.stage.new_value === 'contacted') {
  const created = new Date(lead.created_at);
  const contacted = new Date();
  const responseTimeMinutes = Math.floor((contacted - created) / (1000 * 60));

  return {
    response_time_minutes: responseTimeMinutes,
    first_contact_at: contacted.toISOString()
  };
}

return {};
```

### 8. Lead Enrichment

**Purpose:** Auto-populate lead fields from external data sources.

**Nodes:**
1. **Webhook Trigger** - Listen to new leads
2. **Google Maps API** - Get location details
3. **Phone Validation API** - Validate phone number
4. **Email Validation API** - Validate email
5. **Supabase Update** - Update enriched data

**Enrichment Logic:**
```javascript
// Function node logic
const lead = $input.first().json.lead_data;

const enriched = {};

// Enrich location if partial
if (lead.area && !lead.city) {
  // Use Google Maps to get full address
  const locationData = await getLocationDetails(lead.area);
  enriched.city = locationData.city;
  enriched.google_maps_link = locationData.maps_url;
}

// Validate and format phone
if (lead.phone) {
  const phoneData = await validatePhone(lead.phone);
  enriched.phone = phoneData.formatted;
  enriched.has_whatsapp = phoneData.whatsapp_available;
}

// Validate email
if (lead.email) {
  const emailData = await validateEmail(lead.email);
  enriched.email_valid = emailData.valid;
}

return enriched;
```

## Database Integration

### Supabase Configuration

**Required Environment Variables:**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Required Tables:**
- `leads` (enhanced with new fields)
- `lead_activities` (for tracking automation events)
- `user_profiles` (for team member data)
- `automation_logs` (for tracking automation success/failure)

### Automation Metadata Field

The `automation_metadata` JSONB field in the leads table stores:
```json
{
  "last_automation_run": "2024-01-23T10:00:00Z",
  "automation_status": {
    "auto_assigned": true,
    "reminder_sent": "2024-01-20T09:00:00Z",
    "score_calculated": "2024-01-23T10:00:00Z",
    "enrichment_completed": true
  },
  "automation_errors": [],
  "custom_tags": ["high_value", "repeat_customer"]
}
```

## Setup Instructions

### 1. Install n8n
```bash
npm install -g n8n
n8n start
```

### 2. Configure Webhooks
- Set up webhook URLs in your n8n instance
- Configure authentication for your API endpoints
- Test webhook connectivity

### 3. Set Up External Integrations
- **WhatsApp Business API**: For sending template messages
- **Telegram Bot**: For team notifications
- **Google Maps API**: For location enrichment
- **Email Service**: For digest emails

### 4. Import Workflows
- Export workflows from this documentation
- Import into your n8n instance
- Configure credentials and environment variables
- Test each workflow individually

### 5. Monitor and Optimize
- Set up monitoring for failed automations
- Review automation logs weekly
- Adjust scoring algorithms based on conversion data
- Update message templates based on response rates

## Best Practices

1. **Error Handling**: Always include error handling nodes
2. **Rate Limiting**: Respect API rate limits for external services
3. **Data Privacy**: Ensure GDPR compliance for lead data
4. **Testing**: Test workflows with sample data before production
5. **Monitoring**: Set up alerts for failed automations
6. **Backup**: Regular backup of n8n workflow configurations
7. **Documentation**: Keep workflow documentation updated
8. **Performance**: Monitor automation performance and optimize

## Troubleshooting

### Common Issues

1. **Webhook Not Triggering**
   - Check webhook URL configuration
   - Verify authentication headers
   - Check n8n webhook node status

2. **Supabase Connection Issues**
   - Verify environment variables
   - Check Supabase project status
   - Review RLS policies

3. **External API Failures**
   - Check API rate limits
   - Verify API credentials
   - Review API documentation changes

4. **Message Delivery Issues**
   - Check WhatsApp/Telegram bot status
   - Verify phone number formats
   - Review message template compliance

### Monitoring Dashboard

Create a simple monitoring dashboard to track:
- Automation success rates
- Lead conversion improvements
- Response time trends
- Team productivity metrics

This automation system will significantly improve lead management efficiency and conversion rates for your healthcare services business.
