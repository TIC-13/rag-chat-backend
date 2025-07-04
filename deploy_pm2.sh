#!/bin/bash

# PM2 RAG Chat Setup Script
# This script creates a PM2 process that runs yarn install, prisma migrate, and yarn start

set -e  # Exit on any error

echo "Setting up PM2 process for RAG Chat..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Error: PM2 is not installed. Please install it first:"
    echo "npm install -g pm2"
    exit 1
fi

# Check if yarn is installed
if ! command -v yarn &> /dev/null; then
    echo "Error: Yarn is not installed. Please install it first."
    exit 1
fi

# Create PM2 ecosystem file for the process
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'rag_chat',
    script: 'yarn',
    args: 'start',
    cwd: process.cwd(),
    env: {
      NODE_ENV: 'production'
    },
    post_update: [
      'yarn install',
      'npx prisma migrate deploy'
    ],
    restart_delay: 1000,
    max_restarts: 5,
    min_uptime: '10s'
  }]
};
EOF

echo "Pulling latest changes from Git..."
git pull

echo "Installing dependencies..."
yarn install

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Starting PM2 process..."
pm2 start ecosystem.config.js

echo "Saving PM2 configuration..."
pm2 save

echo "Setting up PM2 startup script..."
pm2 startup

echo ""
echo "✅ RAG Chat PM2 process setup complete!"
echo ""
echo "Useful PM2 commands:"
echo "  pm2 status          - Check process status"
echo "  pm2 logs rag_chat   - View logs"
echo "  pm2 restart rag_chat - Restart the process"
echo "  pm2 stop rag_chat   - Stop the process"
echo "  pm2 delete rag_chat - Delete the process"
echo ""
