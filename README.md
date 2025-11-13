# KakaoTalk Chatbot - Deployment Package

This folder contains everything you need to deploy the KakaoTalk chatbot to AWS Lightsail (or any Linux server).

## 📦 Package Contents

| File | Description |
|------|-------------|
| `app.py` | Main FastAPI application |
| `requirements.txt` | Python dependencies |
| `reference.txt` | Knowledge base for chatbot responses |
| `setup.sh` | Automated setup script |
| `chatbot.service` | Systemd service file |
| `DEPLOYMENT_GUIDE.md` | Comprehensive deployment instructions |

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

1. Upload all files to your Lightsail instance:
   ```bash
   scp -i your-key.pem -r deployment/* ubuntu@your-ip:~/chatbot/
   ```

2. SSH into your instance:
   ```bash
   ssh -i your-key.pem ubuntu@your-ip
   ```

3. Run the setup script:
   ```bash
   cd ~/chatbot
   chmod +x setup.sh
   ./setup.sh
   ```

4. Follow the prompts and enter your OpenAI API key when asked.

### Option 2: Manual Setup

See `DEPLOYMENT_GUIDE.md` for detailed step-by-step instructions.

## 🔑 Before You Deploy

1. **Get your OpenAI API key** from [platform.openai.com](https://platform.openai.com/)
2. **Create a KakaoTalk chatbot** at [i.kakao.com](https://i.kakao.com/)
3. **Launch a Lightsail instance** with Ubuntu 20.04+

## ⚙️ Configuration

### OpenAI API Key

Edit `app.py` line 19:
```python
API_KEY = "your-openai-api-key-here"
```

### Knowledge Base

Edit `reference.txt` to add your chatbot's knowledge:
```
최종 업데이트: 2025년 1월 18일

FILENAME: your_document.pdf
[Your content here]
--- 내용 끝 ---
```

## 🌐 After Deployment

Your chatbot will be accessible at:
- **Root**: `http://your-ip:8000/`
- **Chat endpoint**: `http://your-ip:8000/chat/`
- **Callback endpoint**: `http://your-ip:8000/callback/`
- **PDF upload**: `http://your-ip:8000/upload-pdf`

Configure these URLs in your KakaoTalk chatbot settings.

## 🔧 Management Commands

```bash
# View logs
sudo journalctl -u chatbot -f

# Restart service
sudo systemctl restart chatbot

# Stop service
sudo systemctl stop chatbot

# Check status
sudo systemctl status chatbot
```

## 📝 Updating Knowledge Base

### Method 1: Edit directly
```bash
nano ~/chatbot/reference.txt
# No restart needed - changes take effect immediately
```

### Method 2: Upload PDF
```bash
curl -X POST -F "file=@document.pdf" http://your-ip:8000/upload-pdf
```

## 🔒 Security Notes

- Store API keys securely (use environment variables in production)
- Configure firewall to only allow necessary ports
- Consider setting up HTTPS with Nginx (see DEPLOYMENT_GUIDE.md)
- Regularly update system packages and dependencies

## 🐛 Troubleshooting

### Service won't start
```bash
sudo journalctl -u chatbot -n 50
```

### Check if port is available
```bash
sudo lsof -i :8000
```

### Test application manually
```bash
cd ~/chatbot
source venv/bin/activate
python app.py
```

## 📚 Documentation

- **Full deployment guide**: See `DEPLOYMENT_GUIDE.md`
- **FastAPI docs**: https://fastapi.tiangolo.com/
- **OpenAI API docs**: https://platform.openai.com/docs/

## 💡 Features

✅ ChatGPT-powered responses  
✅ Custom knowledge base (reference.txt)  
✅ PDF document upload and processing  
✅ Async callback support for long-running requests  
✅ KakaoTalk integration  
✅ Automatic response with context  

## 🆘 Need Help?

1. Check `DEPLOYMENT_GUIDE.md` for detailed instructions
2. Review application logs: `sudo journalctl -u chatbot -f`
3. Verify all configuration in `app.py`

---

**Note**: This application does NOT require ngrok when deployed on Lightsail. Ngrok is only needed for local development.

