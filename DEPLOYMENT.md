# BASARNAS Media Archive - Docker Deployment Guide

## Prerequisites

- Docker installed (version 20.10+)
- Docker Compose installed (version 2.0+)
- AWS credentials (for S3 storage)
- AWS RDS PostgreSQL instance (or use local Postgres container)

## Quick Start

### 1. Environment Setup

Create a `.env` file in the root directory with your configuration:

```env
# Database Configuration
# For AWS RDS, use your RDS endpoint
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=basarnas_media
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_SSL=true

# For local Postgres (using docker-compose postgres service), use:
# DB_HOST=postgres
# DB_PORT=5432
# DB_NAME=basarnas_media
# DB_USER=postgres
# DB_PASSWORD=postgres
# DB_SSL=false

# AWS S3 Configuration
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your-bucket-name

# JWT Secret (change this!)
JWT_SECRET=your_super_secret_jwt_key_change_this
```

### 2. Database Migration

If using AWS RDS or external database, run migrations first:

```bash
cd backend
npm install
node run-migration.js
node run-migration-users.js
cd ..
```

If using the local Postgres container, migrations will need to be run after starting the services.

### 3. Build and Start Services

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

This will start:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **PostgreSQL**: localhost:5432 (if using local DB)

### 4. Access the Application

- Open your browser to http://localhost:3000
- Admin login: http://localhost:3000/admin
  - Default credentials: `admin` / `admin123` (change after first login!)

## Docker Commands

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v

# Rebuild specific service
docker-compose up -d --build backend
```

## Production Deployment

### Using Docker Compose on a Server

1. **Copy files to server**:
   ```bash
   scp -r . user@your-server:/path/to/app
   ```

2. **SSH into server**:
   ```bash
   ssh user@your-server
   cd /path/to/app
   ```

3. **Set up environment**:
   ```bash
   nano .env  # Edit with production values
   ```

4. **Start services**:
   ```bash
   docker-compose up -d --build
   ```

5. **Set up reverse proxy** (Nginx example):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /api {
           proxy_pass http://localhost:4000;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
       }
   }
   ```

### Environment Variables

The application uses the following environment variables:

**Backend**:
- `PORT`: Backend port (default: 4000)
- `NODE_ENV`: Environment (production/development)
- `DB_HOST`: Database host
- `DB_PORT`: Database port
- `DB_NAME`: Database name
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password
- `DB_SSL`: Enable SSL for database connection
- `AWS_REGION`: AWS region for S3
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `S3_BUCKET_NAME`: S3 bucket name
- `JWT_SECRET`: Secret for JWT tokens

**Frontend**:
- `NEXT_PUBLIC_API_BASE_URL`: Backend API URL (default: http://backend:4000 in Docker)

## Troubleshooting

### Frontend can't connect to backend
- Check that `NEXT_PUBLIC_API_BASE_URL` is set correctly
- For Docker: use `http://backend:4000`
- For local dev: use `http://localhost:4000`

### Database connection errors
- Verify `.env` file has correct credentials
- Check if database is accessible from Docker container
- For AWS RDS: ensure security group allows connections

### S3 upload errors
- Verify AWS credentials are correct
- Check S3 bucket permissions
- Ensure bucket exists and is in the correct region

### Port conflicts
- If ports 3000 or 4000 are in use, modify `docker-compose.yml`:
  ```yaml
  ports:
    - "8080:3000"  # Map to different host port
  ```

## Architecture

```
┌─────────────────┐
│   Frontend      │  Port 3000
│   (Next.js)     │
└────────┬────────┘
         │
         │ HTTP
         ▼
┌─────────────────┐
│   Backend       │  Port 4000
│   (Fastify)     │
└────┬────────┬───┘
     │        │
     │        └──────► AWS S3 (Media Storage)
     │
     ▼
┌─────────────────┐
│   PostgreSQL    │  Port 5432
│   (Database)    │
└─────────────────┘
```

## Security Notes

- Change default admin password immediately
- Use strong JWT_SECRET in production
- Enable HTTPS with SSL certificates (Let's Encrypt)
- Restrict database access to backend only
- Use environment-specific `.env` files
- Never commit `.env` files to version control
