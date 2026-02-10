#!/bin/bash

# EC2 Setup Verification and Fix Script
# Run this script to verify all required files are present

echo "========================================="
echo "EC2 Setup Verification"
echo "========================================="
echo ""

# Check current directory
echo "Current directory: $(pwd)"
echo ""

# Check for required files
echo "Checking required files..."
echo ""

FILES=(
    "docker-compose.yml"
    "backend/Dockerfile"
    "frontend/Dockerfile"
    "backend/package.json"
    "frontend/package.json"
)

MISSING_FILES=()

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - MISSING"
        MISSING_FILES+=("$file")
    fi
done

echo ""

# Check for .env file
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo ""
    echo "Environment variables configured:"
    grep -v "^#" .env | grep -v "^$" | cut -d'=' -f1 | sed 's/^/  - /'
else
    echo "❌ .env file is MISSING"
    echo ""
    echo "To fix:"
    echo "  1. Create .env file from template:"
    echo "     nano .env"
    echo ""
    echo "  2. Add these required variables:"
    cat << 'EOF'
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=basarnas_media
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_SSL=true

AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=your-bucket-name

JWT_SECRET=your_jwt_secret_here
NEXT_PUBLIC_API_BASE_URL=http://your-ec2-ip:4000
EOF
    MISSING_FILES+=(".env")
fi

echo ""

# Summary
if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo "========================================="
    echo "✅ All required files are present!"
    echo "========================================="
    echo ""
    echo "You can now run:"
    echo "  docker-compose up -d --build"
else
    echo "========================================="
    echo "❌ Missing ${#MISSING_FILES[@]} file(s)"
    echo "========================================="
    echo ""
    echo "Missing files:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    echo ""
    echo "Please upload missing files to EC2 before deploying."
fi

echo ""
