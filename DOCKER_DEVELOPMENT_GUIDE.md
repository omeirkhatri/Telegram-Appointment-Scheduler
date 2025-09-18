# Docker Development Guide for MediCare Scheduler

## 🚀 Quick Start

### 1. Setup Environment
```bash
# Run the setup script
./setup-docker-dev.sh

# Or manually create .env.local with the content from setup-docker-dev.sh
```

### 2. Start Development Environment
```bash
# Start all services
docker-compose up -d

# Check if all services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Access Your Application
- **Main App**: http://localhost:3000
- **Supabase Studio**: http://localhost:54323 (Database management)
- **Email Testing**: http://localhost:54324 (Inbucket - see all emails sent)
- **API Gateway**: http://localhost:54321 (Supabase API)

## 🛠️ Development Workflow

### Daily Development
```bash
# Start development
docker-compose up -d

# View logs for specific service
docker-compose logs -f app
docker-compose logs -f supabase-db

# Stop development
docker-compose down
```

### Database Management
```bash
# Connect to database directly
docker exec -it scheduler-supabase-db-1 psql -U postgres

# Run migrations
docker-compose exec supabase-db psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/migrations/your_migration.sql

# Backup database
docker-compose exec supabase-db pg_dump -U postgres postgres > backup.sql
```

### Code Changes
- Your code changes are automatically reflected (volume mounting)
- For dependency changes, rebuild: `docker-compose up -d --build`
- For database schema changes, add new migration files to `supabase/migrations/`

## 🔧 Service Management

### Available Services
1. **app** - Next.js application (port 3000)
2. **supabase-db** - PostgreSQL database (port 54322)
3. **supabase-kong** - API Gateway (port 54321)
4. **supabase-auth** - Authentication service
5. **supabase-storage** - File storage service
6. **supabase-studio** - Database management UI (port 54323)
7. **supabase-inbucket** - Email testing (port 54324)
8. **redis** - Caching service (port 6379)

### Useful Commands
```bash
# Restart specific service
docker-compose restart app

# Rebuild and restart
docker-compose up -d --build app

# View service status
docker-compose ps

# Clean up (remove containers and volumes)
docker-compose down -v

# View resource usage
docker stats
```

## 📊 Monitoring & Debugging

### Health Checks
All services have health checks. Check status with:
```bash
docker-compose ps
```

### Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs app
docker-compose logs supabase-db

# Follow logs in real-time
docker-compose logs -f app
```

### Database Access
```bash
# Connect to database
docker exec -it scheduler-supabase-db-1 psql -U postgres

# List databases
\l

# Connect to specific database
\c postgres

# List tables
\dt

# Exit
\q
```

## 🚀 Production Migration

When ready for production:

1. **Export data from Docker**:
   ```bash
   # Create backup
   docker-compose exec supabase-db pg_dump -U postgres postgres > production-backup.sql
   ```

2. **Update environment variables** for your server:
   - Change `NEXT_PUBLIC_SUPABASE_URL` to your server URL
   - Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
   - Update `DATABASE_URL` to point to your server

3. **Import data to server**:
   ```bash
   psql -h your-server -U postgres -d postgres < production-backup.sql
   ```

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000, 54321-54326, 6379 are available
2. **Permission issues**: Run `chmod +x setup-docker-dev.sh`
3. **Database connection**: Wait 2-3 minutes for all services to start
4. **Memory issues**: Increase Docker memory allocation

### Reset Everything
```bash
# Stop and remove everything
docker-compose down -v

# Remove all images
docker system prune -a

# Start fresh
docker-compose up -d
```

## 📝 Notes

- All data is persisted in Docker volumes
- Code changes are reflected immediately (hot reload)
- Database migrations run automatically on startup
- Email testing is available through Inbucket
- All services are connected via the `medicare-network` Docker network
