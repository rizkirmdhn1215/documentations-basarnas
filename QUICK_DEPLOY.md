# Quick Deployment Guide for EC2 with Nginx

## Your Current Setup

✅ **Environment Variables**: Configured in root `.env`
✅ **Nginx Proxy**: Frontend uses `/api` for backend calls
✅ **Database**: AWS RDS PostgreSQL
✅ **Storage**: AWS S3 (documentation-sar bucket)

## Step-by-Step Deployment on EC2

### 1. Upload Files to EC2

Make sure all these files are on your EC2 instance:

```bash
# On your local machine, from the project directory
scp -i your-key.pem -r ./* ubuntu@your-ec2-ip:/home/ubuntu/documentations-basarnas/

# Or if using Git
git add .
git commit -m "Add deployment files"
git push

# Then on EC2
cd ~/documentations-basarnas
git pull
```

### 2. Deploy Docker Containers

```bash
cd ~/documentations-basarnas

# Build and start containers
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

Expected output:
```
✓ Container basarnas-postgres   Running
✓ Container basarnas-backend    Running
✓ Container basarnas-frontend   Running
```

### 3. Setup Nginx

```bash
# Make script executable
chmod +x setup-nginx.sh

# Run setup script
sudo bash setup-nginx.sh
```

This will:
- Install Nginx
- Configure reverse proxy
- Route `/api` to backend (port 4000)
- Route `/` to frontend (port 3000)
- Start Nginx service

### 4. Verify Deployment

```bash
# Check containers
docker ps

# Check Nginx
sudo systemctl status nginx

# Test backend (internal)
curl http://localhost:4000

# Test frontend (internal)
curl http://localhost:3000

# Test via Nginx (external)
curl http://localhost/
curl http://localhost/api
```

### 5. Access Your Application

Open in browser:
```
http://YOUR_EC2_PUBLIC_IP
```

The application should load with:
- Frontend accessible at root `/`
- Backend API accessible at `/api`

## Important Notes

### Security Group Settings

Make sure your EC2 security group allows:
```
Port 22  (SSH)     - Your IP only
Port 80  (HTTP)    - 0.0.0.0/0
Port 443 (HTTPS)   - 0.0.0.0/0 (if using SSL)
```

Ports 3000 and 4000 should **NOT** be exposed publicly (Nginx handles routing).

### RDS Security Group

Make sure your RDS security group allows:
```
Port 5432 (PostgreSQL) - EC2 security group or EC2 private IP
```

### Environment Variables

The `.env` file is configured with:
- `NODE_ENV=production` - Production mode
- `NEXT_PUBLIC_API_BASE_URL=/api` - Nginx proxy routing
- Your actual AWS credentials and RDS connection

### File Upload Limits

Nginx is configured for:
- Max upload size: 100MB
- Timeout: 600 seconds (10 minutes)

Perfect for your multi-file upload feature!

## Troubleshooting

### Containers won't start

```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Restart
docker-compose restart
```

### Nginx errors

```bash
# Test config
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Database connection issues

```bash
# Test RDS connection from EC2
psql -h db-document.cpo8cw2aa7ez.ap-southeast-2.rds.amazonaws.com -U postgres -d postgres

# If it fails, check:
# 1. RDS security group allows EC2 IP
# 2. DB credentials in .env are correct
# 3. DB_SSL=true is set
```

### API calls fail (404 or CORS)

Check that:
1. Backend is running: `docker ps | grep backend`
2. Nginx config is correct: `sudo nginx -t`
3. Frontend env uses `/api`: Check `NEXT_PUBLIC_API_BASE_URL=/api` in `.env`

## Useful Commands

```bash
# Docker
docker-compose logs -f              # View all logs
docker-compose logs -f backend      # Backend logs only
docker-compose restart              # Restart all
docker-compose down                 # Stop all
docker-compose up -d --build        # Rebuild and start

# Nginx
sudo systemctl status nginx         # Check status
sudo systemctl restart nginx        # Restart
sudo nginx -t                       # Test config
sudo tail -f /var/log/nginx/error.log  # View errors

# System
df -h                               # Check disk space
docker system df                    # Docker disk usage
docker system prune -a              # Clean up Docker
```

## Next Steps (Optional)

### 1. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

### 2. Setup Domain Name

1. Point your domain to EC2 public IP (A record)
2. Update nginx.conf `server_name` with your domain
3. Get SSL certificate (see above)
4. Restart Nginx

### 3. Setup Monitoring

Consider setting up:
- CloudWatch for logs and metrics
- Automated backups for RDS
- Disk space monitoring
- Uptime monitoring

## Summary

Your application is now running with:
- ✅ Docker containers (backend, frontend, postgres)
- ✅ Nginx reverse proxy
- ✅ AWS RDS PostgreSQL database
- ✅ AWS S3 storage
- ✅ Multi-file upload with temp storage
- ✅ Production-ready configuration

Access at: **http://YOUR_EC2_PUBLIC_IP**
