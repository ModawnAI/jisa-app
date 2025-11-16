# PM2 Quick Start - KakaoTalk Chat Server

## 🎯 Most Common Commands

```bash
# Check if server is running
pm2 status

# View live logs
pm2 logs kakaotalk-chat

# Restart after code changes
pm2 restart kakaotalk-chat

# Stop the server
pm2 stop kakaotalk-chat

# Start the server
pm2 start ecosystem.config.js
```

## ✅ Current Status

Your server is now running with PM2! 

- **Name**: kakaotalk-chat
- **Port**: 8000
- **Status**: online
- **Auto-restart**: enabled
- **Logs**: `/home/bitnami/context-hub/kakaotalk_app/logs/`

## 🔧 Quick Test

```bash
curl http://localhost:8000
```

Expected response: `{"message":"kakaoTest"}`

## 📱 Access Server

- Local: `http://localhost:8000`
- External: `http://YOUR_SERVER_IP:8000`

## 🆘 If Something Goes Wrong

```bash
# Check error logs
pm2 logs kakaotalk-chat --err

# Restart everything
pm2 restart kakaotalk-chat

# Nuclear option - start fresh
pm2 delete kakaotalk-chat
pm2 start ecosystem.config.js
```

## 📚 Full Documentation

See `PM2_GUIDE.md` for complete documentation.

---

**Status**: ✅ Server is running in background with PM2
**Next Steps**: You can now close your terminal and the server will keep running!





