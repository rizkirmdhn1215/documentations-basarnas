# EC2 Docker Deployment Guide

This guide provides step-by-step instructions for deploying the BASARNAS Media Archive application on AWS EC2 using Docker.

## Prerequisites

- AWS Account with EC2 access
- AWS RDS PostgreSQL database (already configured)
- AWS S3 bucket (already configured)
- Domain name (optional, for HTTPS)

## EC2 Instance Requirements

### Recommended Specifications
- **Instance Type**: t3.medium or larger (2 vCPU, 4 GB RAM minimum)
- **Storage**: 30 GB SSD minimum
- **OS**: Amazon Linux 2023 or Ubuntu 22.04 LTS
- **Security Group**: Open ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

## Step 1: Launch EC2 Instance

1. **Go to EC2 Console** → Launch Instance
2. **Choose AMI**: Amazon Linux 2023 or Ubuntu 22.04
3. **Instance Type**: t3.medium
4. **Configure Storage**: 30 GB gp3
5. **Security Group**: Create or select with these rules:
   ```
   SSH (22)    - Your IP
   HTTP (80)   - 0.0.0.0/0
   HTTPS (443) - 0.0.0.0/0
   ```
6. **Key Pair**: Create or select existing
7. **Launch Instance**

## Step 2: Connect to EC2 Instance

```bash
# SSH into your instance
ssh -i your-key.pem ec2-user@your-ec2-public-ip

# For Ubuntu, use:
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

## Step 3: Install Docker and Docker Compose

### For Amazon Linux 2023:
```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add ec2-user to docker group
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Log out and back in for group changes to take effect
exit
# SSH back in
```

### For Ubuntu 22.04:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add ubuntu user to docker group
sudo usermod -a -G docker ubuntu

# Verify installations
docker --version
docker-compose --version

# Log out and back in for group changes to take effect
exit
# SSH back in
```

## Step 4: Install Git and Clone Repository

```bash
# Install Git
sudo yum install -y git  # Amazon Linux
# OR
sudo apt install -y git  # Ubuntu

# Clone your repository
git clone https://github.com/your-username/your-repo.git
cd your-repo

# Or upload files via SCP
# scp -i your-key.pem -r ./DokumentasiAPP ec2-user@your-ec2-ip:/home/ec2-user/
```

## Step 5: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Create .env file
nano .env
```

Add the following configuration:

```env
# Database Configuration (AWS RDS)
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=basarnas_media
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_SSL=true

# AWS S3 Configuration
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your-bucket-name

# JWT Secret (generate a strong secret)
JWT_SECRET=your_super_secret_jwt_key_change_this

# API URL (use your EC2 public IP or domain)
NEXT_PUBLIC_API_BASE_URL=http://your-ec2-public-ip:4000
```

**Important**: Replace all placeholder values with your actual credentials.

To generate a strong JWT secret:
```bash
openssl rand -base64 32
```

## Step 6: Update Frontend API URL

If using a domain or specific IP, update the frontend environment:

```bash
# Edit docker-compose.yml
nano docker-compose.yml
```

Update the frontend service environment:
```yaml
frontend:
  environment:
    NODE_ENV: production
    NEXT_PUBLIC_API_BASE_URL: http://your-domain.com:4000
    # OR use EC2 public IP
    # NEXT_PUBLIC_API_BASE_URL: http://54.123.45.67:4000
```

## Step 7: Run Database Migrations

Before starting the application, ensure your RDS database has the required tables:

```bash
# Connect to your RDS database
psql -h your-rds-endpoint.rds.amazonaws.com -U your_db_user -d basarnas_media

# Run migrations (if you have migration files)
# Check backend/migrations/ directory
```

Or run migrations from the backend container after starting:
```bash
docker-compose up -d backend
docker exec -it basarnas-backend node migrations/run-migrations.js
```

## Step 8: Build and Start Docker Containers

```bash
# Build and start all services
docker-compose up -d --build

# This will:
# 1. Build backend image
# 2. Build frontend image
# 3. Start PostgreSQL (if using local DB)
# 4. Start backend on port 4000
# 5. Start frontend on port 3000
```

## Step 9: Verify Deployment

```bash
# Check running containers
docker ps

# Check logs
docker-compose logs -f

# Check specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Test backend health
curl http://localhost:4000

# Test frontend
curl http://localhost:3000
```

## Step 10: Configure Nginx Reverse Proxy (Optional but Recommended)

For production, use Nginx as a reverse proxy:

```bash
# Install Nginx
sudo yum install -y nginx  # Amazon Linux
# OR
sudo apt install -y nginx  # Ubuntu

# Create Nginx configuration
sudo nano /etc/nginx/conf.d/basarnas.conf
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # or EC2 public IP

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for file uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # Increase max body size for file uploads
    client_max_body_size 100M;
}
```

Start Nginx:
```bash
# Test configuration
sudo nginx -t

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Restart Nginx if already running
sudo systemctl restart nginx
```

Update `.env` to use Nginx:
```env
NEXT_PUBLIC_API_BASE_URL=http://your-domain.com
```

Restart containers:
```bash
docker-compose down
docker-compose up -d
```

## Step 11: Setup SSL with Let's Encrypt (Optional)

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx  # Amazon Linux
# OR
sudo apt install -y certbot python3-certbot-nginx  # Ubuntu

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

Update `.env` to use HTTPS:
```env
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com
```

## Useful Docker Commands

```bash
# View running containers
docker ps

# View all containers
docker ps -a

# View logs
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart
docker-compose restart backend
docker-compose restart frontend

# Stop services
docker-compose stop

# Start services
docker-compose start

# Rebuild and restart
docker-compose up -d --build

# Remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Execute command in container
docker exec -it basarnas-backend sh
docker exec -it basarnas-frontend sh

# View container resource usage
docker stats
```

## Monitoring and Maintenance

### Check Disk Space
```bash
df -h
docker system df
```

### Clean Up Docker
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a
```

### Backup Volumes
```bash
# Backup temp_uploads volume
docker run --rm -v basarnas_temp_uploads:/data -v $(pwd):/backup alpine tar czf /backup/temp_uploads_backup.tar.gz -C /data .

# Restore temp_uploads volume
docker run --rm -v basarnas_temp_uploads:/data -v $(pwd):/backup alpine tar xzf /backup/temp_uploads_backup.tar.gz -C /data
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Check if ports are in use
sudo netstat -tulpn | grep :4000
sudo netstat -tulpn | grep :3000
```

### Database connection issues
```bash
# Test RDS connection from EC2
psql -h your-rds-endpoint.rds.amazonaws.com -U your_db_user -d basarnas_media

# Check RDS security group allows EC2 IP
# Check DB_SSL setting in .env
```

### S3 upload issues
```bash
# Verify AWS credentials
docker exec -it basarnas-backend sh
env | grep AWS

# Check S3 bucket permissions
# Ensure EC2 instance has S3 access (IAM role or credentials)
```

### Out of disk space
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a

# Check temp_uploads volume
docker volume inspect basarnas_temp_uploads
```

## Security Best Practices

1. **Use IAM Roles**: Attach IAM role to EC2 for S3 access instead of hardcoding credentials
2. **Restrict Security Groups**: Only allow necessary IPs for SSH
3. **Use HTTPS**: Always use SSL in production
4. **Strong Passwords**: Use strong database and JWT secrets
5. **Regular Updates**: Keep system and Docker updated
6. **Backup**: Regular backups of database and volumes
7. **Monitoring**: Set up CloudWatch for monitoring

## Cost Optimization

1. **Use Reserved Instances**: For long-term deployments
2. **Auto-scaling**: Consider ECS/EKS for auto-scaling
3. **S3 Lifecycle**: Configure S3 lifecycle policies
4. **RDS**: Use appropriate instance size
5. **CloudWatch**: Monitor and optimize resource usage

## Next Steps

- Set up CloudWatch for monitoring
- Configure automated backups
- Set up CI/CD pipeline
- Configure auto-scaling
- Set up load balancer for high availability
