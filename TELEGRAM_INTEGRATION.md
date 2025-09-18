# Telegram Bot Integration

This document describes the Telegram bot integration implemented for the Best DOC Scheduler application.

## Overview

The Telegram bot integration provides real-time appointment notifications and daily agenda delivery to staff members via Telegram. It works alongside the existing email notification system to ensure staff members receive timely updates about their appointments.

## Features

### 1. Appointment Notifications
- **Same-day appointments**: Immediate Telegram notifications when appointments are created for today
- **Appointment updates**: Notifications when appointments are modified
- **Appointment cancellations**: Notifications when appointments are cancelled
- **Rich formatting**: HTML-formatted messages with appointment details, patient information, and Google Maps links

### 2. Daily Agenda
- **Scheduled delivery**: Daily agenda sent at 9 PM Dubai time for the next day
- **Staff-specific**: Each staff member receives their own agenda with only their appointments
- **Comprehensive details**: Time, patient info, address, notes, and transportation details

### 3. Bot Commands
- `/start` - Welcome message and bot introduction
- `/help` - List of available commands and features
- `/status` - Check bot status and configuration

## Technical Implementation

### 1. Environment Configuration

Add the following environment variables to your `.env` file:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret-token
```

### 2. Database Schema

The integration adds two new fields to the `staff` table:

```sql
ALTER TABLE staff ADD COLUMN telegram_user_id TEXT;
ALTER TABLE staff ADD COLUMN telegram_verified BOOLEAN DEFAULT false;
```

### 3. API Endpoints

#### `/api/telegram/send` (POST)
Send messages to staff members via Telegram.

**Request Body:**
```json
{
  "staff_id": "uuid",
  "test_message": true
}
```

#### `/api/telegram/send` (GET)
Get bot information and webhook status.

#### `/api/telegram/webhook` (POST)
Handle incoming webhook updates from Telegram.

#### `/api/telegram/setup` (POST)
Manage webhook configuration.

**Request Body:**
```json
{
  "action": "set_webhook|delete_webhook|get_info",
  "webhook_url": "https://your-domain.com/api/telegram/webhook"
}
```

#### `/api/notifications/daily-agenda` (POST)
Send daily agenda via both email and Telegram.

**Request Body:**
```json
{
  "date": "2024-01-15",
  "staffId": "uuid",
  "testMode": false
}
```

### 4. Services

#### TelegramService (`src/services/telegramService.ts`)
Core service for interacting with the Telegram Bot API:
- Send messages
- Get bot information
- Manage webhooks
- Format appointment messages
- Format daily agenda messages

#### TelegramNotificationService (`src/services/telegramNotificationService.ts`)
High-level service for sending notifications:
- Send appointment notifications
- Send daily agenda
- Send test messages
- Handle staff assignments

### 5. Staff Management

Staff members can now have a Telegram User ID associated with their account:
- Added to staff form with validation
- Numeric validation (Telegram user IDs are numeric)
- Optional field - staff can choose to use Telegram or not

## Setup Instructions

### 1. Create a Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Use `/newbot` command
3. Follow the prompts to create your bot
4. Save the bot token provided

### 2. Get Staff Telegram User IDs

1. Staff members need to start a conversation with your bot
2. Send `/start` command to the bot
3. The webhook will receive the user information
4. Extract the user ID from the webhook data
5. Add the user ID to the staff member's profile in the admin interface

### 3. Configure Webhook

1. Set up your webhook URL: `https://your-domain.com/api/telegram/webhook`
2. Use the setup API to configure the webhook:
   ```bash
   curl -X POST https://your-domain.com/api/telegram/setup \
     -H "Content-Type: application/json" \
     -d '{
       "action": "set_webhook",
       "webhook_url": "https://your-domain.com/api/telegram/webhook"
     }'
   ```

### 4. Test the Integration

1. Visit `/telegram-test` page in your application
2. Check bot status and configuration
3. Send test messages to staff members
4. Verify webhook is working correctly

## Message Formats

### Appointment Notification

```
🆕 New Appointment

📅 Date: 15, Jan 2024
⏰ Time: 09:00 - 10:00
🏥 Type: Doctor on Call
👤 Patient: John Doe
📞 Phone: +971 50 123 4567
📍 Address: Villa 123, Jumeirah, Dubai
👨‍⚕️ Staff: Dr. Smith (Doctor)

📝 Notes: Regular checkup

🗺️ Open in Google Maps
```

### Daily Agenda

```
📅 Daily Agenda - Monday, 15 Jan 2024

👤 Staff: Dr. Smith
📊 Total Appointments: 3

1. 09:00 - 10:00
   🏥 Doctor on Call
   👤 John Doe
   📞 +971 50 123 4567
   📍 Villa 123, Jumeirah, Dubai

2. 14:00 - 15:00
   🏥 Teleconsultation
   👤 Jane Smith
   📞 +971 50 987 6543

3. 16:00 - 17:00
   🏥 Follow-up
   👤 Ahmed Ali
   📞 +971 50 555 1234
   📍 Apartment 456, Marina, Dubai
```

## Error Handling

The integration includes comprehensive error handling:
- Invalid bot tokens
- Network failures
- Invalid user IDs
- Webhook verification
- Message delivery failures

All errors are logged with appropriate context for debugging.

## Security

- Webhook secret token verification
- User ID validation
- Rate limiting (handled by Telegram)
- Input sanitization

## Monitoring

The integration provides detailed logging:
- Message send attempts and results
- Webhook processing
- Error conditions
- Performance metrics

## Testing

Use the `/telegram-test` page to:
- Verify bot configuration
- Test message sending
- Check webhook status
- Send test messages to staff

## Troubleshooting

### Common Issues

1. **Bot not responding**
   - Check bot token is correct
   - Verify webhook is set up
   - Check server logs for errors

2. **Messages not delivered**
   - Verify staff has correct Telegram user ID
   - Check if staff has started conversation with bot
   - Verify bot is not blocked by staff

3. **Webhook not working**
   - Check webhook URL is accessible
   - Verify SSL certificate
   - Check webhook secret token

### Debug Steps

1. Check bot status via `/api/telegram/send` (GET)
2. Verify webhook configuration via `/api/telegram/setup`
3. Test message sending via `/telegram-test` page
4. Check application logs for detailed error messages

## Future Enhancements

Potential improvements for the Telegram integration:
- Interactive buttons for appointment actions
- Inline keyboards for quick responses
- File sharing for appointment documents
- Voice message support
- Group notifications for team appointments
- Custom notification preferences per staff member
