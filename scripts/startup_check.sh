#!/bin/bash

###############################################################################
# Startup Check Script for Gold Inventory Management System
# Run this script after system restart or to verify all services are ready
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Gold Inventory Management System${NC}"
echo -e "${BLUE}Startup Verification${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Function to check if a service is running
check_service_status() {
    local service_name=$1
    local status=$(sudo supervisorctl status "$service_name" 2>&1)
    
    if echo "$status" | grep -q "RUNNING"; then
        echo -e "${GREEN}✅ $service_name: RUNNING${NC}"
        return 0
    elif echo "$status" | grep -q "STARTING"; then
        echo -e "${YELLOW}⏳ $service_name: STARTING...${NC}"
        return 1
    elif echo "$status" | grep -q "STOPPED"; then
        echo -e "${RED}❌ $service_name: STOPPED${NC}"
        return 2
    elif echo "$status" | grep -q "BACKOFF\|FATAL\|EXITED"; then
        echo -e "${RED}❌ $service_name: FAILED${NC}"
        return 3
    else
        echo -e "${YELLOW}⚠️ $service_name: UNKNOWN STATUS${NC}"
        return 4
    fi
}

# Step 1: Check if supervisor is running
echo -e "${BLUE}Step 1: Checking Supervisor...${NC}"
if pgrep supervisord > /dev/null; then
    echo -e "${GREEN}✅ Supervisor is running${NC}"
else
    echo -e "${RED}❌ Supervisor is not running!${NC}"
    echo -e "${YELLOW}Starting supervisor...${NC}"
    sudo service supervisor start
    sleep 2
fi
echo ""

# Step 2: Check all services
echo -e "${BLUE}Step 2: Checking All Services...${NC}"
services=("mongodb" "backend" "frontend" "nginx-code-proxy")
failed_services=()

for service in "${services[@]}"; do
    check_service_status "$service"
    status=$?
    if [ $status -ne 0 ]; then
        failed_services+=("$service")
    fi
done
echo ""

# Step 3: Handle failed services
if [ ${#failed_services[@]} -gt 0 ]; then
    echo -e "${YELLOW}Step 3: Restarting Failed Services...${NC}"
    
    for service in "${failed_services[@]}"; do
        echo -e "${YELLOW}Restarting $service...${NC}"
        
        # Special handling for frontend - ensure dependencies are installed
        if [ "$service" == "frontend" ]; then
            echo -e "${YELLOW}Checking frontend dependencies...${NC}"
            if [ ! -f "/app/frontend/node_modules/.bin/craco" ]; then
                echo -e "${YELLOW}Installing missing frontend dependencies...${NC}"
                cd /app/frontend && yarn install --frozen-lockfile
            fi
        fi
        
        sudo supervisorctl restart "$service"
    done
    
    echo ""
    echo -e "${YELLOW}Waiting for services to stabilize...${NC}"
    sleep 10
    echo ""
    
    echo -e "${BLUE}Step 4: Re-checking Services...${NC}"
    all_good=true
    for service in "${failed_services[@]}"; do
        check_service_status "$service"
        if [ $? -ne 0 ]; then
            all_good=false
        fi
    done
    echo ""
    
    if [ "$all_good" = true ]; then
        echo -e "${GREEN}✅ All services recovered successfully!${NC}"
    else
        echo -e "${RED}❌ Some services still failing. Check logs for details.${NC}"
        echo -e "${YELLOW}Backend logs: tail -f /var/log/supervisor/backend.err.log${NC}"
        echo -e "${YELLOW}Frontend logs: tail -f /var/log/supervisor/frontend.err.log${NC}"
    fi
else
    echo -e "${GREEN}✅ All services are running correctly!${NC}"
fi

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Final Status:${NC}"
echo -e "${BLUE}=========================================${NC}"
sudo supervisorctl status
echo ""

# Step 5: Test endpoints
echo -e "${BLUE}Step 5: Testing Endpoints...${NC}"

# Wait a bit more for services to be fully ready
sleep 3

# Test backend
if curl -s -f http://localhost:8001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is responding${NC}"
else
    echo -e "${YELLOW}⚠️ Backend API not responding yet (may still be starting)${NC}"
fi

# Test frontend
if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo -e "${YELLOW}⚠️ Frontend not responding yet (may still be compiling)${NC}"
fi

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${GREEN}Startup Check Complete!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${YELLOW}Note: If frontend is still compiling, wait 30-60 seconds and refresh your browser.${NC}"
echo ""

exit 0
