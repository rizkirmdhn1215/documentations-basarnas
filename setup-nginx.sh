#!/bin/bash

# Nginx Setup Script for EC2
# This script configures Nginx as a reverse proxy for the application

set -e

echo "========================================="
echo "Nginx Setup for BASARNAS Media Archive"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with sudo:"
    echo "  sudo bash setup-nginx.sh"
    exit 1
fi

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    
    # Detect OS
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    fi
    
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt update
        apt install -y nginx
    elif [ "$OS" = "amzn" ] || [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        yum install -y nginx
    else
        echo "❌ Unsupported OS. Please install Nginx manually."
        exit 1
    fi
    
    echo "✅ Nginx installed"
else
    echo "✅ Nginx is already installed"
fi

echo ""

# Copy nginx configuration
echo "📝 Configuring Nginx..."

# Backup existing default config if it exists
if [ -f /etc/nginx/sites-available/default ]; then
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
    echo "✅ Backed up existing default config"
fi

# Copy our nginx config
cp nginx.conf /etc/nginx/sites-available/basarnas

# Create symlink if sites-enabled exists (Ubuntu/Debian)
if [ -d /etc/nginx/sites-enabled ]; then
    rm -f /etc/nginx/sites-enabled/default
    ln -sf /etc/nginx/sites-available/basarnas /etc/nginx/sites-enabled/basarnas
    echo "✅ Created symlink in sites-enabled"
else
    # For Amazon Linux/CentOS, include directly in nginx.conf
    if ! grep -q "include /etc/nginx/sites-available/basarnas" /etc/nginx/nginx.conf; then
        sed -i '/http {/a \    include /etc/nginx/sites-available/basarnas;' /etc/nginx/nginx.conf
    fi
    echo "✅ Added config to nginx.conf"
fi

# Test nginx configuration
echo ""
echo "🧪 Testing Nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

# Start and enable Nginx
echo ""
echo "🚀 Starting Nginx..."
systemctl enable nginx
systemctl restart nginx

if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx failed to start"
    systemctl status nginx
    exit 1
fi

echo ""
echo "========================================="
echo "✅ Nginx Setup Complete!"
echo "========================================="
echo ""
echo "Your application is now accessible at:"
echo "  http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-server-ip')"
echo ""
echo "Useful commands:"
echo "  Check status:  sudo systemctl status nginx"
echo "  View logs:     sudo tail -f /var/log/nginx/error.log"
echo "  Restart:       sudo systemctl restart nginx"
echo "  Test config:   sudo nginx -t"
echo ""
