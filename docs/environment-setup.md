# Environment Setup Guide

This guide provides comprehensive instructions for setting up the MediCare Scheduler application environment variables and configuration.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp env.example .env.local
   ```

2. Fill in the required values in `.env.local`

3. Validate your configuration:
   ```bash
   npm run validate-env
   ```

## Environment Variables Reference

### Application Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Application environment (`development`, `production`, `test`) |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` | Public URL of the application |
| `TZ` | Yes | `Asia/Dubai` | Application timezone (GMT+4 Dubai time) |
| `PORT` | No | `3000` | Port for the application server |
| `HEALTH_CHECK_PATH` | No | `/api/health` | Health check endpoint path |
| `CORS_ORIGIN` | No | - | CORS origin for production deployment |

### Supabase Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `http://127.0.0.1:54321` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Local dev key | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Local dev key | Supabase service role key (server-side only) |

**Local Development:**
- Use the default values when running `npx supabase start`
- These work with the local Supabase Docker setup

**Production:**
- Get your credentials from: https://app.supabase.com/project/YOUR_PROJECT/settings/api
- Replace the local defaults with your actual project credentials

### Google Calendar API Configuration

The application supports two authentication methods:

#### Service Account Authentication (Recommended)

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL` | Yes* | Service account email |
| `GOOGLE_CALENDAR_PRIVATE_KEY` | Yes* | Service account private key |
| `GOOGLE_CALENDAR_PROJECT_ID` | Yes* | Google Cloud project ID |

#### OAuth2 Client Authentication (Alternative)

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CALENDAR_CLIENT_ID` | Yes* | OAuth2 client ID |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Yes* | OAuth2 client secret |

#### Additional Google Calendar Settings

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CALENDAR_API_KEY` | No | API key for public API access |
| `GOOGLE_CALENDAR_WEBHOOK_SECRET` | No | Secret for webhook validation |

*At least one authentication method (Service Account or OAuth2) is required.

### Email Configuration (SMTP)

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | Yes* | SMTP server hostname |
| `SMTP_PORT` | Yes* | SMTP server port (usually 587 or 465) |
| `SMTP_USER` | Yes* | SMTP username |
| `SMTP_PASS` | Yes* | SMTP password |
| `SMTP_FROM_NAME` | No | Sender name (default: "MediCare Scheduler") |
| `SMTP_FROM_EMAIL` | No | Sender email address |

*Required for email functionality (daily agendas, notifications).

### Security & Performance Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes (prod) | Secret for JWT token generation |
| `RATE_LIMIT_MAX_REQUESTS` | No | Max requests per window (default: 100) |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in ms (default: 15 min) |
| `DATABASE_POOL_SIZE` | No | Database connection pool size (default: 10) |
| `DATABASE_POOL_TIMEOUT` | No | Database pool timeout in ms (default: 30s) |

### Monitoring & Logging

| Variable | Required | Description |
|----------|----------|-------------|
| `LOG_LEVEL` | No | Logging level (`error`, `warn`, `info`, `debug`) |
| `SENTRY_DSN` | No | Sentry DSN for error tracking |

### Development & Testing

| Variable | Required | Description |
|----------|----------|-------------|
| `TEST_DATABASE_URL` | No | Test database connection string |
| `MOCK_GOOGLE_CALENDAR` | No | Mock Google Calendar API (default: false) |
| `MOCK_EMAIL_SERVICE` | No | Mock email service (default: false) |

## Setup Instructions by Service

### 1. Supabase Setup

#### Local Development with Docker Compose (Recommended)
```bash
# Set up and start all services with Docker
./scripts/docker-setup.sh setup

# The default environment variables will work automatically
```

#### Local Development with Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
npx supabase start

# The default environment variables will work automatically
```

#### Production
1. Create a Supabase project at https://app.supabase.com
2. Get your project credentials from Settings > API
3. Update your `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

### 2. Google Calendar Setup

#### Service Account Method (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Google Calendar API
4. Create a service account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Name: `medicare-scheduler-calendar`
   - Download the JSON key file
5. Extract credentials from the JSON file:
   ```env
   GOOGLE_CALENDAR_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_CALENDAR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
   GOOGLE_CALENDAR_PROJECT_ID=your-project-id
   ```

#### OAuth2 Method (Alternative)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth2 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
3. Add to your `.env.local`:
   ```env
   GOOGLE_CALENDAR_CLIENT_ID=your_client_id_here
   GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret_here
   ```

### 3. Email Setup (SMTP)

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=MediCare Scheduler
SMTP_FROM_EMAIL=your-email@gmail.com
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM_NAME=MediCare Scheduler
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

#### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM_NAME=MediCare Scheduler
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

### 4. Security Setup

#### Generate JWT Secret
```bash
# Generate a secure random string
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Generate Webhook Secret
```bash
# Generate a secure random string for Google Calendar webhooks
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Environment-Specific Configurations

### Development
```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
LOG_LEVEL=debug
MOCK_GOOGLE_CALENDAR=false
MOCK_EMAIL_SERVICE=false
```

### Production
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
LOG_LEVEL=info
JWT_SECRET=your-secure-jwt-secret
CORS_ORIGIN=https://yourdomain.com
```

### Testing
```env
NODE_ENV=test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
MOCK_GOOGLE_CALENDAR=true
MOCK_EMAIL_SERVICE=true
```

## Security Best Practices

### 1. Environment File Security
- **Never commit `.env.local` to version control**
- Use `.env.example` as a template only
- Add `.env.local` to `.gitignore`

### 2. Production Security
- Use strong, unique secrets for `JWT_SECRET` and `GOOGLE_CALENDAR_WEBHOOK_SECRET`
- Rotate secrets regularly
- Use environment-specific configurations
- Enable HTTPS in production
- Set up proper CORS origins

### 3. API Key Management
- Store sensitive keys in environment variables, not in code
- Use different keys for development and production
- Regularly rotate API keys
- Monitor API key usage

### 4. Database Security
- Use connection pooling for production
- Set appropriate timeouts
- Monitor database connections
- Use SSL connections in production

## Validation and Troubleshooting

### Environment Validation
```bash
# Validate your environment configuration
npm run validate-env
```

### Common Issues

#### Supabase Connection Issues
- Verify your Supabase URL and keys
- Check if Supabase is running locally (`npx supabase status`)
- Ensure your project is active in production

#### Google Calendar Issues
- Verify service account permissions
- Check if Google Calendar API is enabled
- Ensure private key format is correct (with `\n` for newlines)

#### Email Issues
- Verify SMTP credentials
- Check firewall settings for SMTP ports
- Test with a simple email client first

#### Security Issues
- Ensure JWT_SECRET is set in production
- Verify webhook secrets are secure
- Check CORS configuration

### Debug Mode
```env
LOG_LEVEL=debug
NODE_ENV=development
```

This will provide detailed logging for troubleshooting.

## Docker Development

### Quick Start with Docker

```bash
# Clone the repository
git clone <repository-url>
cd scheduler

# Set up environment
cp env.example .env.local

# Start all services with Docker
./scripts/docker-setup.sh setup
```

### Docker Commands

```bash
# Start services
./scripts/docker-setup.sh start
# or
docker-compose up -d

# Stop services
./scripts/docker-setup.sh stop
# or
docker-compose down

# View logs
./scripts/docker-setup.sh logs
# or
docker-compose logs -f

# Check status
./scripts/docker-setup.sh status
# or
docker-compose ps

# Clean up everything
./scripts/docker-setup.sh cleanup
```

### Docker Service URLs

- 📱 **Next.js App**: http://localhost:3000
- 🗄️ **Supabase Studio**: http://localhost:54323
- 📧 **Email Testing**: http://localhost:54324
- 🔗 **Supabase API**: http://localhost:54321
- 🗃️ **Database**: localhost:54322
- 📊 **Redis**: localhost:6379

## Next Steps

1. **Complete Setup**: Follow the service-specific setup instructions above
2. **Test Configuration**: Run `npm run validate-env` to verify your setup
3. **Start Development**:
   - With Docker: `./scripts/docker-setup.sh setup`
   - Traditional: `npm run dev`
4. **Deploy**: Follow the deployment guide for production setup

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the service-specific documentation
3. Check the application logs for detailed error messages
4. Ensure all required environment variables are set correctly
