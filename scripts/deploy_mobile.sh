#!/bin/bash
# =============================================================================
# SDM REWARDS - Mobile App Deployment Script
# =============================================================================
# This script automates the build and deployment of the Expo mobile web app.
# It handles:
#   - Installing dependencies
#   - Building the web export
#   - Optimizing assets
#   - Deploying to the backend static folder
#   - Verifying the deployment
#
# Usage:
#   ./deploy_mobile.sh [options]
#
# Options:
#   --clean       Clean build (remove node_modules and reinstall)
#   --skip-deps   Skip dependency installation
#   --no-optimize Skip asset optimization
#   --verbose     Show detailed output
#   --help        Show this help message
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MOBILE_DIR="/app/mobile"
BACKEND_DIR="/app/backend"
STATIC_DIR="$BACKEND_DIR/static/mobile"
BACKUP_DIR="$BACKEND_DIR/static/mobile_backup"
LOG_FILE="/tmp/mobile_deploy_$(date +%Y%m%d_%H%M%S).log"

# Default options
CLEAN_BUILD=false
SKIP_DEPS=false
NO_OPTIMIZE=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --no-optimize)
            NO_OPTIMIZE=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "SDM REWARDS - Mobile Deployment Script"
            echo ""
            echo "Usage: ./deploy_mobile.sh [options]"
            echo ""
            echo "Options:"
            echo "  --clean       Clean build (remove node_modules and reinstall)"
            echo "  --skip-deps   Skip dependency installation"
            echo "  --no-optimize Skip asset optimization"
            echo "  --verbose     Show detailed output"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Logging function
log() {
    local level=$1
    shift
    local message=$@
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)
            echo -e "${BLUE}[$timestamp] [INFO]${NC} $message"
            ;;
        SUCCESS)
            echo -e "${GREEN}[$timestamp] [SUCCESS]${NC} $message"
            ;;
        WARNING)
            echo -e "${YELLOW}[$timestamp] [WARNING]${NC} $message"
            ;;
        ERROR)
            echo -e "${RED}[$timestamp] [ERROR]${NC} $message"
            ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Check if required tools are installed
check_requirements() {
    log INFO "Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        log ERROR "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log ERROR "npm is not installed"
        exit 1
    fi
    
    # Check if mobile directory exists
    if [ ! -d "$MOBILE_DIR" ]; then
        log ERROR "Mobile directory not found: $MOBILE_DIR"
        exit 1
    fi
    
    log SUCCESS "All requirements met"
}

# Install dependencies
install_dependencies() {
    if [ "$SKIP_DEPS" = true ]; then
        log INFO "Skipping dependency installation (--skip-deps)"
        return
    fi
    
    log INFO "Installing dependencies..."
    
    cd "$MOBILE_DIR"
    
    if [ "$CLEAN_BUILD" = true ]; then
        log INFO "Clean build requested, removing node_modules..."
        rm -rf node_modules package-lock.json
    fi
    
    if [ ! -d "node_modules" ]; then
        log INFO "Running npm install..."
        npm install --legacy-peer-deps 2>&1 | tee -a "$LOG_FILE"
    else
        log INFO "node_modules exists, running npm ci..."
        npm ci --legacy-peer-deps 2>&1 | tee -a "$LOG_FILE" || npm install --legacy-peer-deps 2>&1 | tee -a "$LOG_FILE"
    fi
    
    log SUCCESS "Dependencies installed"
}

# Build the web export
build_web() {
    log INFO "Building Expo web export..."
    
    cd "$MOBILE_DIR"
    
    # Remove old build
    rm -rf web-build dist
    
    # Set environment variables for build
    export NODE_ENV=production
    export EXPO_PUBLIC_API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
    
    log INFO "API URL: $EXPO_PUBLIC_API_URL"
    
    # Run expo export for web
    if [ "$VERBOSE" = true ]; then
        npx expo export --platform web 2>&1 | tee -a "$LOG_FILE"
    else
        npx expo export --platform web >> "$LOG_FILE" 2>&1
    fi
    
    # Check if build was successful
    if [ -d "dist" ]; then
        log SUCCESS "Web export completed successfully"
        BUILD_DIR="dist"
    elif [ -d "web-build" ]; then
        log SUCCESS "Web export completed successfully"
        BUILD_DIR="web-build"
    else
        log ERROR "Web export failed - no output directory found"
        exit 1
    fi
}

# Optimize assets
optimize_assets() {
    if [ "$NO_OPTIMIZE" = true ]; then
        log INFO "Skipping asset optimization (--no-optimize)"
        return
    fi
    
    log INFO "Optimizing assets..."
    
    cd "$MOBILE_DIR/$BUILD_DIR"
    
    # Compress JavaScript files if possible
    if command -v terser &> /dev/null; then
        find . -name "*.js" -type f | while read file; do
            if [ "$VERBOSE" = true ]; then
                log INFO "Compressing: $file"
            fi
            terser "$file" -c -m -o "$file" 2>/dev/null || true
        done
    fi
    
    # Calculate total size
    TOTAL_SIZE=$(du -sh . | cut -f1)
    log SUCCESS "Optimization complete. Total size: $TOTAL_SIZE"
}

# Backup current deployment
backup_current() {
    if [ -d "$STATIC_DIR" ]; then
        log INFO "Backing up current deployment..."
        rm -rf "$BACKUP_DIR"
        cp -r "$STATIC_DIR" "$BACKUP_DIR"
        log SUCCESS "Backup created at $BACKUP_DIR"
    fi
}

# Deploy to backend
deploy() {
    log INFO "Deploying to backend static folder..."
    
    # Ensure static directory exists
    mkdir -p "$BACKEND_DIR/static"
    
    # Remove old deployment
    rm -rf "$STATIC_DIR"
    
    # Copy new build
    cp -r "$MOBILE_DIR/$BUILD_DIR" "$STATIC_DIR"
    
    # Set permissions
    chmod -R 755 "$STATIC_DIR"
    
    log SUCCESS "Deployed to $STATIC_DIR"
}

# Verify deployment
verify_deployment() {
    log INFO "Verifying deployment..."
    
    # Check if index.html exists
    if [ ! -f "$STATIC_DIR/index.html" ]; then
        log ERROR "index.html not found in deployment"
        exit 1
    fi
    
    # Check if _expo directory exists
    if [ ! -d "$STATIC_DIR/_expo" ]; then
        log WARNING "_expo directory not found"
    fi
    
    # Check if assets directory exists
    if [ ! -d "$STATIC_DIR/assets" ]; then
        log WARNING "assets directory not found"
    fi
    
    # Get deployment size
    DEPLOY_SIZE=$(du -sh "$STATIC_DIR" | cut -f1)
    
    # Count files
    FILE_COUNT=$(find "$STATIC_DIR" -type f | wc -l)
    
    log SUCCESS "Deployment verified"
    log INFO "  - Size: $DEPLOY_SIZE"
    log INFO "  - Files: $FILE_COUNT"
    
    # Get backend URL
    BACKEND_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
    
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  Mobile App Deployment Complete!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "  ${BLUE}URL:${NC} ${BACKEND_URL}/api/mobile"
    echo ""
    echo -e "  ${BLUE}Size:${NC} $DEPLOY_SIZE"
    echo -e "  ${BLUE}Files:${NC} $FILE_COUNT"
    echo -e "  ${BLUE}Log:${NC} $LOG_FILE"
    echo ""
}

# Rollback to backup
rollback() {
    if [ -d "$BACKUP_DIR" ]; then
        log WARNING "Rolling back to previous deployment..."
        rm -rf "$STATIC_DIR"
        cp -r "$BACKUP_DIR" "$STATIC_DIR"
        log SUCCESS "Rollback complete"
    else
        log ERROR "No backup available for rollback"
        exit 1
    fi
}

# Main execution
main() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  SDM REWARDS - Mobile Deployment${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    
    log INFO "Starting deployment process..."
    log INFO "Log file: $LOG_FILE"
    
    # Run deployment steps
    check_requirements
    install_dependencies
    build_web
    optimize_assets
    backup_current
    deploy
    verify_deployment
    
    log SUCCESS "Deployment completed successfully!"
}

# Handle errors
trap 'log ERROR "Deployment failed at line $LINENO. Check log: $LOG_FILE"; exit 1' ERR

# Run main function
main "$@"
