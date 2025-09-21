# Docker Configuration

This directory contains all Docker-related configuration files and scripts.

## Docker Compose Files

- `docker-compose.yml` - Main development configuration
- `docker-compose.override.yml` - Local development overrides
- `docker-compose.simple.yml` - Simplified configuration for basic setup
- `docker-compose.production.yml` - Production configuration

## Scripts

- `docker-setup.sh` - Initial Docker environment setup
- `setup-docker-dev.sh` - Development environment setup
- `start-cloudflare-tunnel.sh` - Start Cloudflare tunnel for external access

## Usage

### Development
```bash
# Start development environment
docker-compose up -d

# Start with overrides
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### Production
```bash
# Start production environment
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

### Simple Setup
```bash
# Start simplified environment
docker-compose -f docker-compose.simple.yml up -d
```

## Documentation

See `DOCKER_DEVELOPMENT_GUIDE.md` for detailed setup instructions.
