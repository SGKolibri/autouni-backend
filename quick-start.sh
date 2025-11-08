#!/bin/bash

# Quick Start Script for AutoUni Backend

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "🚀 AutoUni Backend - Quick Start"
echo -e "${NC}"

# Step 1: Check Docker
echo -e "${BLUE}[1/4] Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

# Step 2: Start MQTT
echo -e "${BLUE}[2/4] Starting MQTT broker...${NC}"
docker-compose up mqtt -d
sleep 2
echo -e "${GREEN}✓ MQTT broker started${NC}"

# Step 3: Install dependencies
echo -e "${BLUE}[3/4] Installing dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
fi
echo -e "${GREEN}✓ Dependencies ready${NC}"

# Step 4: Start the application
echo -e "${BLUE}[4/4] Starting AutoUni Backend...${NC}"
echo -e "${GREEN}✓ Starting dev server${NC}"
echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo -e "📚 API will be available at: ${BLUE}http://localhost:3000${NC}"
echo -e "📖 Swagger docs at: ${BLUE}http://localhost:3000/docs${NC}"
echo -e "📡 MQTT broker: ${BLUE}localhost:1883${NC}"
echo ""
echo -e "${YELLOW}Starting dev server in watch mode...${NC}"
echo ""

npm run start:dev
