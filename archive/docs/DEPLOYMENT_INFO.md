# JISA Chatbot Deployment Information

## Summary
The JISA chatbot application has been successfully configured and deployed.

## Configuration Details

### Application Setup
- **Location**: `/home/bitnami/archive/context-hub/jisa_app`
- **Port**: 9000
- **Base Path**: `/chat`
- **Domain**: https://jisa.flowos.work/chat/

### Changes Made

1. **start.sh** - Updated to:
   - Run on port 9000
   - Use `/chat` as root path
   - Point to correct directory: `/home/bitnami/archive/context-hub/jisa_app`

2. **app.py** - Updated CORS to include:
   - `https://jisa.flowos.work`

3. **Nginx Configuration**:
   - Created: `/etc/nginx/sites-available/jisa-flowos-work.conf`
   - Enabled: `/etc/nginx/sites-enabled/jisa-flowos-work.conf`
   - Proxies `https://jisa.flowos.work/chat/` → `http://localhost:9000/`

4. **SSL Certificates**:
   - Certificate: `/etc/nginx/ssl/jisa-flowos-work.crt`
   - Key: `/etc/nginx/ssl/jisa-flowos-work.key`

5. **Systemd Service**:
   - Service file: `/etc/systemd/system/jisa-chatbot.service`
   - Enabled and started automatically on boot

## Service Management

### Start the service
```bash
sudo systemctl start jisa-chatbot.service
```

### Stop the service
```bash
sudo systemctl stop jisa-chatbot.service
```

### Restart the service
```bash
sudo systemctl restart jisa-chatbot.service
```

### Check service status
```bash
sudo systemctl status jisa-chatbot.service
```

### View logs
```bash
sudo journalctl -u jisa-chatbot.service -f
```

## Nginx Management

### Test configuration
```bash
sudo nginx -t
```

### Reload nginx
```bash
sudo systemctl reload nginx
```

### Check nginx logs
```bash
# Access log
sudo tail -f /var/log/nginx/jisa-flowos-work-access.log

# Error log
sudo tail -f /var/log/nginx/jisa-flowos-work-error.log
```

## Testing

### Local test
```bash
curl http://localhost:9000/
```

### Through nginx (local)
```bash
curl -k https://localhost/chat/ -H "Host: jisa.flowos.work"
```

### Public URL
```
https://jisa.flowos.work/chat/
```

## API Endpoints

- **Root**: `GET https://jisa.flowos.work/chat/` - Returns `{"message":"kakaoTest"}`
- **Chat**: `POST https://jisa.flowos.work/chat/chat/` - Kakao chatbot endpoint
- **Callback**: `POST https://jisa.flowos.work/chat/callback/` - Callback endpoint
- **Upload PDF**: `POST https://jisa.flowos.work/chat/upload-pdf` - PDF upload endpoint

## Notes

- The application runs under the `bitnami` user
- FastAPI uses uvicorn with `--root-path /chat` for proper URL handling behind nginx
- Nginx handles SSL termination
- The service automatically restarts on failure (RestartSec=10)
- HTTP requests are automatically redirected to HTTPS

## DNS Configuration

Make sure your DNS (Cloudflare or other) has an A record pointing:
```
jisa.flowos.work → [Your server IP]
```

## Security

- SSL/TLS enabled (self-signed certificate - consider using Let's Encrypt for production)
- Cloudflare Real IP configuration included
- Security headers configured
- CORS restricted to specific origins
