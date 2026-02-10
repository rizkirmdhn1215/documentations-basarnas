#!/bin/bash

# Emergency Fix Script for EC2
# This script creates the missing package.json files directly on EC2

echo "========================================="
echo "Creating Missing Package Files on EC2"
echo "========================================="
echo ""

# Create frontend package.json
echo "Creating frontend/package.json..."
cd ~/documentations-basarnas/frontend

cat > package.json << 'EOF'
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@mui/icons-material": "^6.3.0",
    "@mui/material": "^6.3.0",
    "next": "16.1.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "eslint": "^9",
    "eslint-config-next": "16.1.6"
  }
}
EOF

echo "✅ frontend/package.json created"

# Create backend package.json
echo "Creating backend/package.json..."
cd ~/documentations-basarnas/backend

cat > package.json << 'EOF'
{
  "name": "backend",
  "version": "1.0.0",
  "description": "Backend API for BASARNAS Media Archive",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.645.0",
    "@aws-sdk/lib-storage": "^3.645.0",
    "@fastify/cors": "^10.0.1",
    "@fastify/jwt": "^9.0.1",
    "@fastify/multipart": "^9.0.1",
    "bcrypt": "^5.1.1",
    "dotenv": "^17.2.3",
    "fastify": "^5.2.0",
    "pg": "^8.13.1",
    "sharp": "^0.33.5"
  },
  "devDependencies": {
    "nodemon": "^3.1.11"
  }
}
EOF

echo "✅ backend/package.json created"

cd ~/documentations-basarnas

echo ""
echo "========================================="
echo "✅ Package files created successfully!"
echo "========================================="
echo ""
echo "Now run:"
echo "  docker-compose down"
echo "  docker system prune -af"
echo "  docker-compose up -d --build"
echo ""
