# Supabase Migration Instructions

## Current Setup
- **Project URL**: http://127.0.0.1:54321
- **Anon Key**: eyJhbGciOiJIUzI1NiIs...
- **Service Key**: eyJhbGciOiJIUzI1NiIs...

## Files Included
- `schema.sql` - Database schema
- `data.sql` - Application data
- `auth_data.sql` - Authentication data (if any)
- `storage_data.sql` - Storage data (if any)
- `*.sql` - Individual table exports
- `import-to-new-server.sh` - Import script
- `.env.new-server` - Environment template

## Migration Steps

### 1. Set up your new Supabase server
- Deploy your Docker Compose stack on the new server
- Ensure all services are running
- Note down the server IP address

### 2. Update environment variables
```bash
# Copy the environment template
cp .env.new-server .env

# Edit with your new server details
nano .env
```

### 3. Import the data
```bash
# Make the import script executable
chmod +x import-to-new-server.sh

# Run the import
./import-to-new-server.sh
```

### 4. Update your application
- Update your application's environment variables to point to the new server
- Test the connection
- Verify all data is accessible

## Where to Get New Supabase Keys

### For Self-Hosted Supabase (Docker):
1. **Anon Key & Service Key**: These are generated when you start your Supabase stack
2. **JWT Secret**: Generate using: `openssl rand -base64 32`
3. **Database URL**: `postgres://postgres:postgres@your-server-ip:54322/postgres`

### For Supabase Cloud:
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Create a new project or select existing one
4. Go to Settings → API
5. Copy the Project URL, anon key, and service_role key

## Verification
After migration, check:
- [ ] Application loads correctly
- [ ] All patients are visible
- [ ] All staff members are visible
- [ ] All appointments are visible
- [ ] Authentication works
- [ ] File uploads work (if using storage)

## Troubleshooting
- If import fails, check database connection
- If data is missing, check individual table files
- If auth doesn't work, verify JWT secrets match
- If storage doesn't work, check storage configuration

## Rollback
If something goes wrong, you can always:
1. Stop the new server
2. Revert environment variables
3. Restart your local server
4. Your local data remains unchanged
