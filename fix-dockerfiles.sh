#!/bin/bash

# Fix Frontend Dockerfile on EC2
# This script updates the Dockerfile to use npm install instead of npm ci

echo "Fixing Frontend Dockerfile..."

cd ~/documentations-basarnas/frontend

# Backup existing Dockerfile
cp Dockerfile Dockerfile.backup

# Create new Dockerfile with npm install
cat > Dockerfile << 'EOF'
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

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
RUN npm install --omit=dev

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
EOF

echo "✅ Frontend Dockerfile updated"

# Also fix backend Dockerfile
cd ~/documentations-basarnas/backend

cp Dockerfile Dockerfile.backup

cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

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
EOF

echo "✅ Backend Dockerfile updated"

cd ~/documentations-basarnas

echo ""
echo "Now run:"
echo "  docker-compose down"
echo "  docker system prune -af"
echo "  docker-compose up -d --build"
