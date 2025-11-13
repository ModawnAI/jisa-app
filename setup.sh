#!/bin/bash
# Quick Setup Script for Chatbot Deployment on AWS Lightsail

echo "🚀 Starting Chatbot Setup..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running on Ubuntu/Debian
if ! command -v apt &> /dev/null; then
    echo -e "${RED}❌ This script is designed for Ubuntu/Debian systems${NC}"
    exit 1
fi

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Python and dependencies
echo -e "${YELLOW}🐍 Installing Python and dependencies...${NC}"
sudo apt install python3 python3-pip python3-venv -y

# Create project directory
echo -e "${YELLOW}📁 Creating project directory...${NC}"
mkdir -p ~/chatbot
cd ~/chatbot

# Check if files exist
if [ ! -f "app.py" ]; then
    echo -e "${RED}❌ app.py not found in current directory${NC}"
    echo "Please upload app.py, requirements.txt, and reference.txt to ~/chatbot/"
    exit 1
fi

# Create virtual environment
echo -e "${YELLOW}🔧 Creating virtual environment...${NC}"
python3 -m venv venv
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}📚 Installing Python packages...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

# Create botlog.txt if it doesn't exist
touch botlog.txt

# Prompt for OpenAI API key
echo ""
echo -e "${YELLOW}🔑 OpenAI API Key Configuration${NC}"
read -p "Enter your OpenAI API key: " API_KEY

if [ ! -z "$API_KEY" ]; then
    # Update API key in app.py
    sed -i "s/API_KEY = \".*\"/API_KEY = \"$API_KEY\"/" app.py
    echo -e "${GREEN}✅ API key updated${NC}"
else
    echo -e "${RED}⚠️  No API key provided. Please edit app.py manually.${NC}"
fi

# Test the application
echo -e "${YELLOW}🧪 Testing application...${NC}"
timeout 5 python3 -c "from app import app; print('✅ Application imports successfully')" || echo -e "${RED}❌ Import failed${NC}"

# Create systemd service
echo -e "${YELLOW}⚙️  Setting up systemd service...${NC}"
sudo tee /etc/systemd/system/chatbot.service > /dev/null << EOF
[Unit]
Description=Chatbot FastAPI Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/chatbot
Environment="PATH=$HOME/chatbot/venv/bin"
ExecStart=$HOME/chatbot/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
echo -e "${YELLOW}▶️  Starting service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable chatbot
sudo systemctl start chatbot

# Wait a moment for service to start
sleep 3

# Check service status
if sudo systemctl is-active --quiet chatbot; then
    echo -e "${GREEN}✅ Service is running!${NC}"
else
    echo -e "${RED}❌ Service failed to start. Check logs with: sudo journalctl -u chatbot -n 50${NC}"
    exit 1
fi

# Test endpoint
echo -e "${YELLOW}🌐 Testing endpoint...${NC}"
if curl -s http://localhost:8000/ | grep -q "kakaoTest"; then
    echo -e "${GREEN}✅ Application is responding correctly!${NC}"
else
    echo -e "${RED}❌ Application not responding. Check logs: sudo journalctl -u chatbot -f${NC}"
fi

# Get public IP
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com)

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "🌐 Your chatbot is accessible at:"
echo -e "   ${YELLOW}http://$PUBLIC_IP:8000/${NC}"
echo ""
echo -e "📝 KakaoTalk Webhook URLs:"
echo -e "   Chat: ${YELLOW}http://$PUBLIC_IP:8000/chat/${NC}"
echo -e "   Callback: ${YELLOW}http://$PUBLIC_IP:8000/callback/${NC}"
echo ""
echo -e "🔧 Useful commands:"
echo -e "   View logs: ${YELLOW}sudo journalctl -u chatbot -f${NC}"
echo -e "   Restart: ${YELLOW}sudo systemctl restart chatbot${NC}"
echo -e "   Status: ${YELLOW}sudo systemctl status chatbot${NC}"
echo ""
echo -e "⚠️  ${YELLOW}Don't forget to:${NC}"
echo -e "   1. Open port 8000 in Lightsail firewall"
echo -e "   2. Configure webhook URLs in KakaoTalk"
echo -e "   3. Edit reference.txt with your knowledge base"
echo ""

