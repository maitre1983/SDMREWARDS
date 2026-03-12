#!/bin/bash
# =============================================================================
# SDM REWARDS - Quick Mobile Update Script
# =============================================================================
# Fast deployment for small changes (skips full npm install)
# Use this for quick updates to mobile code
#
# Usage: ./quick_mobile_update.sh
# =============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Quick Mobile Update${NC}"

cd /app/mobile

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${RED}node_modules not found. Running full deploy...${NC}"
    /app/scripts/deploy_mobile.sh
    exit 0
fi

echo "Building web export..."
npx expo export --platform web 2>/dev/null

# Deploy
BUILD_DIR="dist"
[ -d "web-build" ] && BUILD_DIR="web-build"

if [ -d "$BUILD_DIR" ]; then
    rm -rf /app/backend/static/mobile
    cp -r "$BUILD_DIR" /app/backend/static/mobile
    chmod -R 755 /app/backend/static/mobile
    
    BACKEND_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
    echo -e "${GREEN}✅ Update complete!${NC}"
    echo -e "   URL: ${BACKEND_URL}/api/mobile"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
