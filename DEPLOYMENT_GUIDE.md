# Chatbot Deployment Guide for AWS Lightsail

This guide will help you deploy the KakaoTalk chatbot to AWS Lightsail.

## 📋 Prerequisites

- AWS Lightsail instance (Ubuntu 20.04 or later recommended)
- SSH access to your Lightsail instance
- OpenAI API key
- KakaoTalk chatbot account

## 📦 Files Included

- `app.py` - Main FastAPI application
- `requirements.txt` - Python dependencies
- `reference.txt` - Knowledge base for the chatbot (add your content here)
- `DEPLOYMENT_GUIDE.md` - This file

## 🚀 Deployment Steps

### 1. Connect to Your Lightsail Instance

```bash
ssh -i /path/to/your-key.pem ubuntu@your-lightsail-ip
```

### 2. Update System and Install Python

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install python3 python3-pip python3-venv -y
```

### 3. Create Project Directory

```bash
mkdir -p ~/chatbot
cd ~/chatbot
```

### 4. Upload Files

Upload the following files to your Lightsail instance:

```bash
# From your local machine:
scp -i /path/to/your-key.pem app.py ubuntu@your-lightsail-ip:~/chatbot/
scp -i /path/to/your-key.pem requirements.txt ubuntu@your-lightsail-ip:~/chatbot/
scp -i /path/to/your-key.pem reference.txt ubuntu@your-lightsail-ip:~/chatbot/
```

Or use FileZilla/WinSCP for easier file transfer.

### 5. Create Virtual Environment

```bash
cd ~/chatbot
python3 -m venv venv
source venv/bin/activate
```

### 6. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 7. Configure the Application

Edit `app.py` and update the following:

1. **OpenAI API Key** (Line 19):
   ```python
   API_KEY = "your-actual-openai-api-key-here"
   ```

2. **Reference File Path** (Line 51):
   ```python
   with open('/home/ubuntu/chatbot/reference.txt', 'r', encoding='utf-8') as f:
   ```

3. **Remove ngrok-specific CORS origins** (Lines 563-567):
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # Or specify your domain
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

### 8. Test the Application

```bash
# Run the server
python app.py

# Or use uvicorn directly:
uvicorn app:app --host 0.0.0.0 --port 8000
```

Test it from another terminal:
```bash
curl http://localhost:8000/
# Should return: {"message":"kakaoTest"}
```

### 9. Configure Firewall

In AWS Lightsail Console:
1. Go to your instance → Networking tab
2. Add firewall rule:
   - Application: Custom
   - Protocol: TCP
   - Port: 8000
   - Click "Create"

### 10. Set Up as a System Service (Production)

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/chatbot.service
```

Paste the following content:

```ini
[Unit]
Description=Chatbot FastAPI Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/chatbot
Environment="PATH=/home/ubuntu/chatbot/venv/bin"
ExecStart=/home/ubuntu/chatbot/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable chatbot
sudo systemctl start chatbot
sudo systemctl status chatbot
```

### 11. Configure KakaoTalk Webhook

In your KakaoTalk chatbot settings:

- **Webhook URL**: `http://your-lightsail-ip:8000/chat/`
- **Callback URL**: `http://your-lightsail-ip:8000/callback/`

If you want to use HTTPS (recommended), set up Nginx with SSL:
- Follow the "Optional: HTTPS Setup" section below

### 12. Test End-to-End

Send a message to your KakaoTalk chatbot and verify:
- ✅ Bot responds within 5 seconds
- ✅ Responses are in Korean
- ✅ Bot uses information from reference.txt

## 🔧 Useful Commands

### View Logs
```bash
# Service logs
sudo journalctl -u chatbot -f

# Application logs (if running manually)
tail -f ~/chatbot/backend.log
```

### Restart Service
```bash
sudo systemctl restart chatbot
```

### Stop Service
```bash
sudo systemctl stop chatbot
```

### Update Application
```bash
cd ~/chatbot
# Upload new app.py file
sudo systemctl restart chatbot
```

## 🔒 Optional: HTTPS Setup with Nginx

### 1. Install Nginx
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 2. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/chatbot
```

Paste:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/chatbot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Get SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com
```

### 4. Update Firewall
In Lightsail Console:
- Add port 80 (HTTP)
- Add port 443 (HTTPS)

### 5. Update KakaoTalk Webhook
- **Webhook URL**: `https://your-domain.com/chat/`
- **Callback URL**: `https://your-domain.com/callback/`

## 🐛 Troubleshooting

### Service won't start
```bash
# Check logs
sudo journalctl -u chatbot -n 50

# Check if port is in use
sudo lsof -i :8000

# Verify virtual environment
ls -la /home/ubuntu/chatbot/venv/bin/
```

### Bot not responding
1. Check if service is running: `sudo systemctl status chatbot`
2. Test endpoint: `curl http://localhost:8000/`
3. Check firewall rules in Lightsail
4. Verify webhook URL in KakaoTalk settings

### OpenAI API errors
1. Verify API key is correct
2. Check API usage/limits on OpenAI dashboard
3. Review logs: `sudo journalctl -u chatbot -f`

## 📝 Updating Knowledge Base

To update the chatbot's knowledge:

1. Edit `reference.txt`:
   ```bash
   nano ~/chatbot/reference.txt
   ```

2. The bot will automatically use the updated content (no restart needed)

3. Or upload PDFs via the API:
   ```bash
   curl -X POST -F "file=@document.pdf" http://your-lightsail-ip:8000/upload-pdf
   ```

## 📊 Monitoring

### Check Application Health
```bash
curl http://localhost:8000/
```

### Monitor Resource Usage
```bash
htop
```

### View Active Connections
```bash
sudo netstat -tulpn | grep :8000
```

## 🔄 Maintenance

### Regular Updates
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Python packages (in venv)
cd ~/chatbot
source venv/bin/activate
pip install --upgrade -r requirements.txt
sudo systemctl restart chatbot
```

### Backup
```bash
# Backup knowledge base
cp ~/chatbot/reference.txt ~/chatbot/reference.txt.backup

# Backup entire directory
tar -czf chatbot-backup-$(date +%Y%m%d).tar.gz ~/chatbot/
```

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [AWS Lightsail Docs](https://aws.amazon.com/lightsail/)
- [OpenAI API Reference](https://platform.openai.com/docs/)
- [KakaoTalk i Open Builder](https://i.kakao.com/)

## 💡 Tips

1. **Use environment variables** for sensitive data (API keys)
2. **Set up monitoring** with CloudWatch or similar
3. **Regular backups** of reference.txt
4. **Log rotation** to prevent disk space issues
5. **Rate limiting** to prevent API abuse

## Support

For issues or questions, refer to the application logs:
```bash
sudo journalctl -u chatbot -f
```

