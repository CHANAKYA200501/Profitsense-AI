#!/bin/bash

# Render Deployment Checklist & Automation Script
# Run this before deploying to Render

set -e

echo "🚀 ProfitSense Backend - Render Deployment Checker"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} Missing: $1"
        FAILED=$((FAILED + 1))
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} Missing: $1"
        FAILED=$((FAILED + 1))
    fi
}

echo "📋 CHECKING REPOSITORY STRUCTURE..."
echo "-----------------------------------"
check_file "render.yaml"
check_file ".env.production.template"
check_file "RENDER_DEPLOYMENT_GUIDE.md"
check_dir "etmind/backend"
check_file "etmind/backend/main.py"
check_file "etmind/backend/requirements.txt"
check_file "etmind/backend/Dockerfile"
check_dir "etmind/backend/migrations"
check_file "etmind/backend/alembic.ini"
echo ""

echo "📦 CHECKING REQUIREMENTS..."
echo "-----------------------------------"
if grep -q "fastapi" "etmind/backend/requirements.txt"; then
    echo -e "${GREEN}✓${NC} FastAPI found in requirements"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} FastAPI not found in requirements"
    FAILED=$((FAILED + 1))
fi

if grep -q "uvicorn" "etmind/backend/requirements.txt"; then
    echo -e "${GREEN}✓${NC} Uvicorn found in requirements"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Uvicorn not found in requirements"
    FAILED=$((FAILED + 1))
fi

if grep -q "psycopg2" "etmind/backend/requirements.txt"; then
    echo -e "${GREEN}✓${NC} PostgreSQL driver found in requirements"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} PostgreSQL driver not found in requirements"
    FAILED=$((FAILED + 1))
fi

if grep -q "sqlalchemy" "etmind/backend/requirements.txt"; then
    echo -e "${GREEN}✓${NC} SQLAlchemy found in requirements"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} SQLAlchemy not found in requirements"
    FAILED=$((FAILED + 1))
fi
echo ""

echo "🔒 CHECKING SECURITY..."
echo "-----------------------------------"
if grep -q ".env" ".gitignore"; then
    echo -e "${GREEN}✓${NC} .env is in .gitignore"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} .env is NOT in .gitignore"
    FAILED=$((FAILED + 1))
fi

if [ ! -f ".env" ] && [ ! -f "etmind/backend/.env" ]; then
    echo -e "${GREEN}✓${NC} No .env files found locally (good for production)"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}⚠${NC} .env file exists locally - make sure it's in .gitignore"
fi
echo ""

echo "🌐 CHECKING MAIN.PY CONFIGURATION..."
echo "-----------------------------------"
if grep -q "CORS" "etmind/backend/main.py"; then
    echo -e "${GREEN}✓${NC} CORS middleware is configured"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} CORS middleware not found"
    FAILED=$((FAILED + 1))
fi

if grep -q "@app.get(\"/api/health\")" "etmind/backend/main.py"; then
    echo -e "${GREEN}✓${NC} Health check endpoint found"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} Health check endpoint not found"
    FAILED=$((FAILED + 1))
fi

if grep -q "FastAPI" "etmind/backend/main.py"; then
    echo -e "${GREEN}✓${NC} FastAPI app is initialized"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗${NC} FastAPI app not found"
    FAILED=$((FAILED + 1))
fi
echo ""

echo "📊 RESULTS"
echo "-----------------------------------"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to deploy to Render.${NC}"
    echo ""
    echo "📝 NEXT STEPS:"
    echo "1. Go to https://render.com and sign up/login"
    echo "2. Connect your GitHub repository"
    echo "3. Create PostgreSQL database instance"
    echo "4. Create Redis instance"
    echo "5. Create Web Service and set environment variables from .env.production.template"
    echo "6. Push code to GitHub and Render will auto-deploy"
    echo "7. Monitor deployment in Render dashboard"
    echo "8. Run: alembic upgrade head (in service shell)"
    echo ""
    echo "🔗 USEFUL LINKS:"
    echo "- Render: https://render.com"
    echo "- PostgreSQL Setup: https://render.com/docs/databases"
    echo "- FastAPI Deployment: https://render.com/docs/deploy-python"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the errors above.${NC}"
    exit 1
fi
