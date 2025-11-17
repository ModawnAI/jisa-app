# KakaoTalk Setup Guide

## ✅ Configuration Complete

The JISA app is now fully configured to receive KakaoTalk webhooks at:
```
https://jisa.flowos.work/api/kakao/chat
```

## How to Run

### 1. Start the Development Server on Port 3000

```bash
cd /home/bitnami/archive/context-hub/jisa_app
PORT=3000 npm run dev
```

**IMPORTANT**: The app MUST run on port 3000 because nginx is configured to proxy to that port.

### 2. Verify It's Running

Check that the server started on port 3000:
```bash
netstat -tlnp | grep 3000
```

You should see:
```
tcp6  0  0 :::3000  :::*  LISTEN  [PID]/next-server
```

### 3. Test the Endpoint

Run the test script:
```bash
./test-kakao.sh
```

This will test:
1. Direct connection to `localhost:3000`
2. Through nginx proxy at `https://jisa.flowos.work`

### 4. Configure KakaoTalk

Go to [KakaoTalk i Open Builder](https://i.kakao.com/) and set:

**Skill URL**: `https://jisa.flowos.work/api/kakao/chat`

## Logging

The app now has **verbose logging** enabled. When you run `npm run dev`, you'll see:

```
================================================================================
🔔 KAKAOTALK WEBHOOK RECEIVED
📅 Time: 2025-01-16T...
🌐 URL: https://jisa.flowos.work/api/kakao/chat
📍 Method: POST
================================================================================
📦 RAW REQUEST BODY:
{
  "userRequest": {
    "utterance": "안녕하세요",
    "user": { "id": "..." }
  }
}
================================================================================
👤 USER INFO:
   Kakao ID: test-user-123
   Nickname: 테스트유저
   Message: "안녕하세요"
   Callback URL: none
================================================================================
```

## Architecture

```
KakaoTalk Webhook
    ↓
https://jisa.flowos.work/api/kakao/chat
    ↓
nginx (port 443)
    ↓
localhost:3000 (Next.js dev server)
    ↓
/api/kakao/chat/route.ts
    ↓
- Verify code (first time users)
- Check RBAC (role/tier)
- Route to Commission or RAG system
- Log to Supabase
    ↓
Response to KakaoTalk
```

## Environment Variables

Already configured in `.env`:
- ✅ `PORT=3000` - Server port
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Supabase project
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Database access
- ✅ `GEMINI_API_KEY` - AI responses
- ✅ `OPENAI_API_KEY` - Embeddings
- ✅ `PINECONE_API_KEY` - Vector search
- ✅ `PINECONE_INDEX=hof-branch-chatbot` - Knowledge base

## Troubleshooting

### No logs appearing?
- Make sure you're running `npm run dev` not `npm start`
- Check that PORT=3000 in your .env file

### KakaoTalk not receiving responses?
1. Check dev server is running: `netstat -tlnp | grep 3000`
2. Test endpoint: `./test-kakao.sh`
3. Check nginx config: `grep proxy_pass /etc/nginx/sites-available/jisa-flowos-work.conf`
4. View nginx logs: `sudo tail -f /var/log/nginx/jisa-flowos-work-error.log`

### Slow responses?
- First request is slow due to cold start
- Subsequent requests should be fast
- KakaoTalk timeout is 5 seconds

## Features

✅ **Verification Code Gating** - First-time users must enter code
✅ **RBAC** - Role and tier-based access control
✅ **Commission Detection** - Automatically detects insurance commission queries
✅ **RAG System** - Pinecone vector search + Gemini AI
✅ **Supabase Logging** - All queries logged for analytics
✅ **Callback Support** - Async responses for long queries

## Testing First-Time User Flow

1. Send any message without code → Request code
2. Send valid code (format: `XXX-XXX-XXX-XXX`) → User verified
3. Send actual question → AI response with RBAC filtering

## Next Steps

1. **Start dev server**: `PORT=3000 npm run dev`
2. **Test locally**: `./test-kakao.sh`
3. **Configure KakaoTalk**: Set webhook URL to `https://jisa.flowos.work/api/kakao/chat`
4. **Test with real KakaoTalk**: Send a message to your bot
5. **Watch logs**: Monitor your terminal for verbose output
