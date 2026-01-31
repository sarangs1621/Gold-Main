#!/bin/bash

###############################################################################
# Health Check Script for Gold Inventory Management System
# This script monitors backend and frontend services and auto-restarts if needed
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log file
LOG_FILE="/var/log/health_check.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if a service is running
check_service() {
    local service_name=$1
    local status=$(sudo supervisorctl status "$service_name" | awk '{print $2}')
    
    if [ "$status" == "RUNNING" ]; then
        return 0
    else
        return 1
    fi
}

# Function to check backend health
check_backend() {
    # Check if backend is running
    if ! check_service "backend"; then
        log "${RED}❌ Backend is not running. Attempting to restart...${NC}"
        sudo supervisorctl restart backend
        sleep 5
        
        if check_service "backend"; then
            log "${GREEN}✅ Backend restarted successfully${NC}"
            return 0
        else
            log "${RED}❌ Failed to restart backend${NC}"
            return 1
        fi
    fi
    
    # Check if backend is responding
    if curl -s -f http://localhost:8001/api/health > /dev/null 2>&1; then
        log "${GREEN}✅ Backend health check passed${NC}"
        return 0
    else
        log "${YELLOW}⚠️ Backend is running but not responding to health checks${NC}"
        # Don't restart yet, just warn
        return 0
    fi
}

# Function to check frontend health
check_frontend() {
    # Check if frontend is running
    if ! check_service "frontend"; then
        log "${RED}❌ Frontend is not running. Attempting to restart...${NC}"
        
        # First ensure dependencies are installed
        log "Checking frontend dependencies..."
        if [ ! -f "/app/frontend/node_modules/.bin/craco" ]; then
            log "Installing missing frontend dependencies..."
            cd /app/frontend && yarn install --frozen-lockfile > /dev/null 2>&1
        fi
        
        sudo supervisorctl restart frontend
        sleep 10
        
        if check_service "frontend"; then
            log "${GREEN}✅ Frontend restarted successfully${NC}"
            return 0
        else
            log "${RED}❌ Failed to restart frontend${NC}"
            return 1
        fi
    fi
    
    log "${GREEN}✅ Frontend health check passed${NC}"
    return 0
}

# Function to check MongoDB
check_mongodb() {
    if ! check_service "mongodb"; then
        log "${RED}❌ MongoDB is not running. Attempting to restart...${NC}"
        sudo supervisorctl restart mongodb
        sleep 3
        
        if check_service "mongodb"; then
            log "${GREEN}✅ MongoDB restarted successfully${NC}"
            return 0
        else
            log "${RED}❌ Failed to restart MongoDB${NC}"
            return 1
        fi
    fi
    
    log "${GREEN}✅ MongoDB health check passed${NC}"
    return 0
}

# Main health check
log "========================================="
log "Starting Health Check"
log "========================================="

# Check all services
check_mongodb
check_backend
check_frontend

# Display overall status
log "========================================="
log "Health Check Complete"
log "========================================="
log ""

# Display current status
sudo supervisorctl status

exit 0
