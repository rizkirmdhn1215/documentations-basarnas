#!/bin/bash

# Quick Deployment Script for EC2
# This script helps you quickly deploy the application on EC2

set -e  # Exit on error

echo "========================================="
echo "BASARNAS Media Archive - Quick Deploy"
echo "========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file from .env.example:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    echo ""
    echo "Then fill in your actual values."
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed!"
    echo "Please install Docker first. See EC2_DEPLOYMENT.md for instructions."
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed!"
    echo "Please install Docker Compose first. See EC2_DEPLOYMENT.md for instructions."
    exit 1
fi

echo "✅ Docker Compose is installed"
echo ""

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true
echo ""

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose up -d --build
echo ""

# Wait for containers to start
echo "⏳ Waiting for containers to start..."
sleep 10
echo ""

# Check container status
echo "📊 Container Status:"
docker-compose ps
echo ""

# Check logs
echo "📝 Recent Logs:"
echo "--- Backend Logs ---"
docker-compose logs --tail=20 backend
echo ""
echo "--- Frontend Logs ---"
docker-compose logs --tail=20 frontend
echo ""

# Test endpoints
echo "🧪 Testing Endpoints:"
echo ""

# Test backend
echo -n "Backend (http://localhost:4000): "
if curl -s http://localhost:4000 > /dev/null; then
    echo "✅ OK"
else
    echo "❌ FAILED"
fi

# Test frontend
echo -n "Frontend (http://localhost:3000): "
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ OK"
else
    echo "❌ FAILED"
fi

echo ""
echo "========================================="
echo "✅ Deployment Complete!"
echo "========================================="
echo ""
echo "Access your application:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:4000"
echo ""
echo "Useful commands:"
echo "  View logs:        docker-compose logs -f"
echo "  Restart:          docker-compose restart"
echo "  Stop:             docker-compose stop"
echo "  Remove:           docker-compose down"
echo ""
echo "For production deployment on EC2, see EC2_DEPLOYMENT.md"
echo ""
