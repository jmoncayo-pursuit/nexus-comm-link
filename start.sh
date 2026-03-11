#!/bin/bash

# --- Nexus Comm-Link Start Script ---

# 1. Colors for logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Initializing Nexus Comm-Link...${NC}"

# 2. Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found. Creating a template...${NC}"
    echo "APP_PASSWORD=nexus" > .env
    echo "GEMINI_API_KEY=your_api_key_here" >> .env
    echo "LIVE_MODEL=gemini-2.5-flash-native-audio-preview-12-2025" >> .env
    echo "PORT=3131" >> .env
fi

# 3. Install dependencies if node_modules is missing
if [ ! -d node_modules ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

# 4. Check for ngrok (optional but recommended for mobile access)
if command -v ngrok &> /dev/null; then
    echo -e "${GREEN}✅ Ngrok detected.${NC}"
else
    echo -e "${YELLOW}ℹ️  Tip: Install ngrok to access this dashboard on your mobile phone away from home.${NC}"
fi

# 5. Start the server
echo -e "${GREEN}📡 Starting Server on port 3131...${NC}"
echo -e "${BLUE}🔗 Dashboard Link: http://localhost:3131${NC}"
npm start
