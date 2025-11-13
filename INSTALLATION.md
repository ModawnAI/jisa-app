# KakaoTalk Chatbot FastAPI Installation Guide

## Overview
This document describes the installation and configuration of the KakaoTalk chatbot FastAPI application that is integrated with the Context Hub Next.js application.

## Installation Completed

### 1. Python Dependencies Installed
All required Python packages have been installed:
- FastAPI 0.104.1
- Uvicorn 0.24.0 (with standard extras)
- OpenAI >= 1.0.0
- aiohttp 3.9.1
- python-multipart (for file uploads)
- typing-extensions >= 4.0

### 2. Package.json Updated
The package.json has been updated with new scripts:
- `npm run chat` - Starts the FastAPI chatbot server
- `npm run dev:all` - Starts Next.js, Socket.IO, and FastAPI servers concurrently

### 3. Nginx Configuration Updated
The nginx configuration has been updated to proxy requests to the FastAPI app:
- **URL**: `https://context.flowos.work/chat/`
- **Proxy Target**: `http://127.0.0.1:8000/`
- **Timeout**: 300 seconds for long-running requests

### 4. Environment Variables
A `.env` file has been created in `/home/bitnami/context-hub/kakaotalk_app/` with:
- `OPENAI_API_KEY` - Your OpenAI API key

## Usage

### Starting the Application

#### Option 1: Start all services together (Recommended)
```bash
cd /home/bitnami/context-hub
npm run dev:all
```
This will start:
- Next.js dev server on port 3000
- Socket.IO server on port 3001
- FastAPI chatbot server on port 8000

#### Option 2: Start services individually
```bash
# Terminal 1: Next.js
cd /home/bitnami/context-hub
npm run dev

# Terminal 2: Socket.IO
cd /home/bitnami/context-hub
npm run socket

# Terminal 3: FastAPI Chatbot
cd /home/bitnami/context-hub
npm run chat
```

### Accessing the Chatbot API

The chatbot API is accessible at:
- **Base URL**: `https://context.flowos.work/chat/`
- **Root Endpoint**: `https://context.flowos.work/chat/` (GET) - Returns {"message": "kakaoTest"}
- **Chat Endpoint**: `https://context.flowos.work/chat/chat/` (POST) - Main chatbot endpoint
- **Upload PDF**: `https://context.flowos.work/chat/upload-pdf` (POST) - Upload and process PDFs

## API Endpoints

### 1. Root
- **Method**: GET
- **URL**: `https://context.flowos.work/chat/`
- **Response**: `{"message": "kakaoTest"}`

### 2. Chat
- **Method**: POST
- **URL**: `https://context.flowos.work/chat/chat/`
- **Request Body**: KakaoTalk webhook format
- **Response**: KakaoTalk response format

### 3. Upload PDF
- **Method**: POST
- **URL**: `https://context.flowos.work/chat/upload-pdf`
- **Content-Type**: multipart/form-data
- **Request**: PDF file
- **Response**: Processing confirmation

### 4. Callback (Internal)
- **Method**: POST
- **URL**: `https://context.flowos.work/chat/callback/`
- **Purpose**: Handle delayed responses from KakaoTalk

## Configuration Files

### File Locations
- **App**: `/home/bitnami/context-hub/kakaotalk_app/app.py`
- **Startup Script**: `/home/bitnami/context-hub/kakaotalk_app/start.sh`
- **Environment**: `/home/bitnami/context-hub/kakaotalk_app/.env`
- **Reference Data**: `/home/bitnami/context-hub/kakaotalk_app/reference.txt`
- **Requirements**: `/home/bitnami/context-hub/kakaotalk_app/requirements.txt`
- **Nginx Config**: `/etc/nginx/sites-available/context-hub`

### Environment Variables
Edit `.env` file to update:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## Testing

### Test the FastAPI Server
```bash
# Test if the server is running
curl http://localhost:8000/

# Test via nginx proxy
curl https://context.flowos.work/chat/
```

### Test Chat Endpoint
```bash
curl -X POST https://context.flowos.work/chat/chat/ \
  -H "Content-Type: application/json" \
  -d '{
    "userRequest": {
      "utterance": "안녕하세요",
      "user": {
        "id": "test-user"
      }
    }
  }'
```

## Troubleshooting

### Check if services are running
```bash
# Check FastAPI
ps aux | grep uvicorn

# Check nginx
sudo systemctl status nginx

# Check nginx logs
sudo tail -f /var/log/nginx/context-hub_error.log
sudo tail -f /var/log/nginx/context-hub_access.log
```

### Restart nginx
```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx  # Reload configuration
```

### View application logs
When running with `npm run dev:all`, all logs will appear in the terminal.

## Security Notes

1. **API Key**: The OpenAI API key is stored in `.env` file. Keep this file secure and do not commit it to version control.
2. **HTTPS**: All external access is through HTTPS via nginx with Let's Encrypt SSL certificates.
3. **CORS**: The FastAPI app has CORS configured to accept requests from localhost:3000 and ngrok domains.

## System Requirements

- Python 3.13.6
- Node.js (for npm)
- Nginx with SSL certificates
- Sufficient disk space for file uploads and reference data

## Maintenance

### Updating Dependencies
```bash
cd /home/bitnami/context-hub/kakaotalk_app
pip3 install -r requirements.txt --upgrade
```

### Updating Reference Data
The chatbot uses `reference.txt` as its knowledge base. To update:
1. Upload PDFs via the `/chat/upload-pdf` endpoint
2. Or manually edit `/home/bitnami/context-hub/kakaotalk_app/reference.txt`

## Production Deployment

For production use, consider:
1. Use a process manager like systemd or PM2 for the FastAPI app
2. Set up proper logging and monitoring
3. Configure rate limiting in nginx
4. Set up backup for reference.txt
5. Use a production-grade WSGI server (uvicorn with workers)

## Support

For issues or questions, refer to:
- FastAPI documentation: https://fastapi.tiangolo.com/
- Uvicorn documentation: https://www.uvicorn.org/
- KakaoTalk chatbot API: https://i.kakao.com/





