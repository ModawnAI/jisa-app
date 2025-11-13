# PM2 Process Manager Guide

## 📋 Overview

The KakaoTalk chat server is now managed by PM2, which will:
- ✅ Run the server in the background
- ✅ Auto-restart on crashes
- ✅ Monitor resource usage
- ✅ Manage logs automatically
- ✅ Restart on system reboot (after setup)

## 🚀 Basic Commands

### Start the Server
```bash
cd /home/bitnami/context-hub/kakaotalk_app
pm2 start ecosystem.config.js
```

### Stop the Server
```bash
pm2 stop kakaotalk-chat
```

### Restart the Server
```bash
pm2 restart kakaotalk-chat
```

### Delete/Remove from PM2
```bash
pm2 delete kakaotalk-chat
```

### View Server Status
```bash
pm2 status
# or
pm2 list
```

### View Real-time Logs
```bash
pm2 logs kakaotalk-chat
```

### View Last 100 Lines of Logs
```bash
pm2 logs kakaotalk-chat --lines 100
```

### Monitor Resource Usage
```bash
pm2 monit
```

### View Detailed Info
```bash
pm2 info kakaotalk-chat
# or
pm2 describe kakaotalk-chat
```

## 🔄 Auto-Start on System Boot

To make PM2 start automatically when the server reboots:

```bash
# Generate startup script
pm2 startup

# Save current process list
pm2 save
```

If you need to remove auto-startup:
```bash
pm2 unstartup
```

## 📊 Log Management

### Log Locations
- **Output logs**: `./logs/pm2-out.log`
- **Error logs**: `./logs/pm2-error.log`
- **Combined logs**: `./logs/pm2-combined.log`

### Clear Old Logs
```bash
pm2 flush
```

### Rotate Logs (to prevent logs from getting too large)
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 🔧 Configuration

The PM2 configuration is in `ecosystem.config.js`:

```javascript
{
  name: 'kakaotalk-chat',
  script: '/opt/bitnami/python/bin/python3',
  args: '-m uvicorn app:app --host 0.0.0.0 --port 8000 --reload',
  cwd: '/home/bitnami/context-hub/kakaotalk_app',
  autorestart: true,
  max_memory_restart: '1G'
}
```

### To modify configuration:
1. Edit `ecosystem.config.js`
2. Restart PM2: `pm2 restart ecosystem.config.js`

## 🐛 Troubleshooting

### Server Not Starting
```bash
# Check logs for errors
pm2 logs kakaotalk-chat --err

# Check if port 8000 is already in use
sudo lsof -i :8000

# View detailed error info
pm2 describe kakaotalk-chat
```

### Server Keeps Restarting
```bash
# Check error logs
pm2 logs kakaotalk-chat --err --lines 50

# Check if running out of memory
pm2 monit
```

### Reset Everything
```bash
# Delete from PM2
pm2 delete kakaotalk-chat

# Kill PM2 daemon
pm2 kill

# Start fresh
pm2 start ecosystem.config.js
```

## 📱 Quick Test

After starting with PM2, test the server:

```bash
curl http://localhost:8000
```

Or test a Pinecone query:
```bash
cd /home/bitnami/context-hub/kakaotalk_app
python -c "
import sys
sys.path.insert(0, '.')
from app import getTextFromGPT
print(getTextFromGPT('인플루언서 마케팅 어떻게 하나요?'))
"
```

## 🔄 Common Workflows

### After Code Changes
```bash
pm2 restart kakaotalk-chat
```

### After Dependencies Update
```bash
pm2 restart kakaotalk-chat
```

### Deploy New Version
```bash
cd /home/bitnami/context-hub/kakaotalk_app
git pull  # if using git
pm2 restart kakaotalk-chat
```

## 📈 Monitoring

### Check Server Health
```bash
# Quick status
pm2 status

# Real-time monitoring
pm2 monit

# View metrics
pm2 info kakaotalk-chat
```

### Web Dashboard (Optional)
For a web-based dashboard:
```bash
pm2 install pm2-server-monit
```

## 🔐 Security Notes

- PM2 is running as user `bitnami`
- Server listens on `0.0.0.0:8000` (all interfaces)
- Logs are stored locally and should be rotated regularly
- Environment variables are loaded from `.env` file

## ✅ Current Status

To check current status at any time:
```bash
pm2 status kakaotalk-chat
```

Output should show:
- Status: `online`
- Uptime: Time since last restart
- CPU & Memory: Resource usage
- Restarts: Number of auto-restarts (should be low)

---

**Pro Tip**: Add `alias pm2chat='pm2 status kakaotalk-chat'` to your `~/.bashrc` for quick status checks!





