# Quick Fix Guide for EC2 Deployment Issues

## Issue: Missing Dockerfile and Environment Variables

### Problem
```
target frontend: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory
WARN: The "S3_BUCKET_NAME" variable is not set
```

### Solution

## Step 1: Verify All Files Are Uploaded

Run the verification script:
```bash
bash verify-setup.sh
```

If files are missing, you need to upload them. Here are the options:

### Option A: Upload via Git (Recommended)

```bash
# On your local machine, commit and push all files
git add .
git commit -m "Add Docker files and configuration"
git push origin main

# On EC2, pull the latest changes
cd ~/documentations-basarnas
git pull origin main
```

### Option B: Upload via SCP

From your local machine:
```bash
# Upload entire project
scp -i your-key.pem -r ./DokumentasiAPP ubuntu@your-ec2-ip:/home/ubuntu/documentations-basarnas

# Or upload specific missing files
scp -i your-key.pem ./DokumentasiAPP/frontend/Dockerfile ubuntu@your-ec2-ip:/home/ubuntu/documentations-basarnas/frontend/
scp -i your-key.pem ./DokumentasiAPP/backend/Dockerfile ubuntu@your-ec2-ip:/home/ubuntu/documentations-basarnas/backend/
```

### Option C: Create Files Manually on EC2

If you can't upload, create the files manually:

#### 1. Create Frontend Dockerfile
```bash
cd ~/documentations-basarnas/frontend
nano Dockerfile
```

Paste this content:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy application code
COPY . .

# Build Next.js application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

#### 2. Create Backend Dockerfile
```bash
cd ~/documentations-basarnas/backend
nano Dockerfile
```

Paste this content:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create temp_uploads directory
RUN mkdir -p temp_uploads

# Expose port
EXPOSE 4000

# Declare volume for temp uploads
VOLUME ["/app/temp_uploads"]

# Start the application
CMD ["npm", "start"]
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

## Step 2: Create .env File

```bash
cd ~/documentations-basarnas
nano .env
```

Add your configuration:
```env
# Database Configuration
DB_HOST=your-rds-endpoint.ap-southeast-2.rds.amazonaws.com
DB_PORT=5432
DB_NAME=basarnas_media
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_SSL=true

# AWS S3 Configuration
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your-bucket-name

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Frontend API URL (use your EC2 public IP)
NEXT_PUBLIC_API_BASE_URL=http://YOUR_EC2_PUBLIC_IP:4000
```

**Important**: Replace ALL placeholder values with your actual credentials!

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

## Step 3: Verify Setup

```bash
bash verify-setup.sh
```

You should see all checkmarks (✅).

## Step 4: Deploy

```bash
# Clean up any previous attempts
docker-compose down -v

# Build and start
docker-compose up -d --build

# Watch logs
docker-compose logs -f
```

## Step 5: Verify Deployment

```bash
# Check containers are running
docker ps

# Test backend
curl http://localhost:4000

# Test frontend
curl http://localhost:3000
```

## Common Issues

### Issue: "no such file or directory"
**Solution**: File is missing. Upload it or create it manually (see above).

### Issue: "variable is not set"
**Solution**: Create `.env` file with all required variables.

### Issue: "permission denied"
**Solution**: Add user to docker group:
```bash
sudo usermod -a -G docker $USER
# Log out and back in
```

### Issue: "port already in use"
**Solution**: Stop conflicting service:
```bash
sudo lsof -i :4000  # Find what's using port 4000
sudo lsof -i :3000  # Find what's using port 3000
# Kill the process or change ports in docker-compose.yml
```

### Issue: Database connection failed
**Solution**: 
1. Check RDS security group allows EC2 IP
2. Verify DB credentials in .env
3. Check DB_SSL setting (should be `true` for RDS)

## Quick Commands Reference

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Rebuild
docker-compose up -d --build

# Check disk space
df -h

# Clean Docker
docker system prune -a
```
