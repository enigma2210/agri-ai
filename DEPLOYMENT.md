# 🚀 Kissan AI - Deployment Guide

Complete guide for deploying Kissan AI to production.

---

## 📋 Pre-Deployment Checklist

- [ ] Domain registered (e.g., kissan.ai)
- [ ] DNS configured (A records pointing to server IP)
- [ ] Server with Docker installed (minimum 2GB RAM, 2 CPU cores)
- [ ] SSL certificate obtained (Let's Encrypt recommended)
- [ ] Backend environment variables configured
- [ ] Frontend environment variables configured

---

## 🖥️ Server Requirements

### Minimum Specifications
- **OS**: Ubuntu 20.04+ or similar Linux distribution
- **RAM**: 2GB minimum, 4GB recommended
- **CPU**: 2 cores minimum
- **Storage**: 20GB minimum
- **Network**: Stable internet connection

### Required Software
- Docker 20.10+
- Docker Compose 2.0+
- Git

---

## 📦 Installation Steps

### Step 1: Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Add user to docker group (optional, for non-root usage)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### Step 2: Clone Repository

```bash
# Install Git if not already installed
sudo apt install git -y

# Clone the repository
git clone <repository-url> kissan-ai
cd kissan-ai
```

### Step 3: Configure Environment Variables

#### Backend Configuration

```bash
cd backend
cp .env.example .env
nano .env  # or use your preferred editor
```

Update these values:
```bash
AGENT_WS_URL=wss://agent.kissan.ai/ws
WS_TIMEOUT=30
WS_MAX_RETRIES=3
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=https://kissan.ai,https://www.kissan.ai
LOG_LEVEL=INFO
```

#### Frontend Configuration

```bash
cd ../frontend
cp .env.local.example .env.local
nano .env.local
```

Update:
```bash
NEXT_PUBLIC_API_URL=https://kissan.ai
```

### Step 4: SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot -y

# Obtain certificate
sudo certbot certonly --standalone -d kissan.ai -d www.kissan.ai

# Copy certificates
sudo cp /etc/letsencrypt/live/kissan.ai/fullchain.pem nginx/ssl/certificate.crt
sudo cp /etc/letsencrypt/live/kissan.ai/privkey.pem nginx/ssl/private.key
sudo chmod 644 nginx/ssl/*.crt
sudo chmod 600 nginx/ssl/*.key
```

#### Option B: Self-Signed (Testing Only)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/private.key \
  -out nginx/ssl/certificate.crt
```

### Step 5: Update Nginx Configuration

```bash
nano nginx/nginx.conf
```

Update server_name:
```nginx
server_name kissan.ai www.kissan.ai;
```

### Step 6: Build and Deploy

```bash
# Build and start services
docker compose up -d --build

# Verify all services are running
docker compose ps

# Check logs
docker compose logs -f
```

Expected output:
```
NAME                    STATUS          PORTS
kissan-ai-backend       Up              0.0.0.0:8000->8000/tcp
kissan-ai-frontend      Up              0.0.0.0:3000->3000/tcp
kissan-ai-nginx         Up              0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### Step 7: Verify Deployment

```bash
# Test backend health
curl http://localhost:8000/api/health

# Test frontend
curl http://localhost:3000

# Test through Nginx
curl https://kissan.ai
```

---

## 🔧 Production Configuration

### Docker Compose Production Updates

For production, update `docker-compose.yml`:

```yaml
services:
  backend:
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
  
  frontend:
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
  
  nginx:
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Firewall Configuration

```bash
# Install UFW
sudo apt install ufw -y

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 🔄 SSL Certificate Auto-Renewal

### Setup Certbot Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e
```

Add this line:
```
0 3 * * * certbot renew --quiet --deploy-hook "docker exec kissan-ai-nginx nginx -s reload"
```

---

## 📊 Monitoring & Logging

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx

# Last 100 lines
docker compose logs --tail=100 backend
```

### Health Monitoring

Create a monitoring script:

```bash
nano /usr/local/bin/kissan-health-check.sh
```

```bash
#!/bin/bash

# Health check script
BACKEND_HEALTH=$(curl -s http://localhost:8000/api/health | grep -o '"status":"healthy"')

if [ -z "$BACKEND_HEALTH" ]; then
    echo "Backend unhealthy - restarting"
    docker compose restart backend
else
    echo "All services healthy"
fi
```

```bash
chmod +x /usr/local/bin/kissan-health-check.sh

# Add to crontab
crontab -e
# Add: */5 * * * * /usr/local/bin/kissan-health-check.sh >> /var/log/kissan-health.log 2>&1
```

---

## 🔐 Security Hardening

### 1. System Updates

```bash
# Enable automatic updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 2. SSH Hardening

```bash
sudo nano /etc/ssh/sshd_config
```

Update:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### 3. Rate Limiting

Already configured in `nginx.conf`:
- API: 10 requests/second
- General: 30 requests/second

### 4. Security Headers

Already configured in `nginx.conf`:
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy

---

## 📈 Performance Optimization

### 1. Enable Docker Logging Limits

Already configured in production compose file (max 10MB per file, 3 files)

### 2. Optimize Nginx

```bash
# Edit nginx.conf worker processes
worker_processes auto;
worker_connections 2048;
```

### 3. Backend Scaling

Update `docker-compose.yml`:

```yaml
backend:
  deploy:
    replicas: 3  # Run 3 instances
    resources:
      limits:
        cpus: '1'
        memory: 512M
```

---

## 🔄 Updates & Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose down
docker compose up -d --build

# Clean old images
docker image prune -a -f
```

### Database Backup (if applicable)

```bash
# Backup script
docker compose exec backend python backup_script.py
```

### Rollback

```bash
# Rollback to previous version
git log  # Find commit hash
git checkout <commit-hash>
docker compose up -d --build
```

---

## 🚨 Troubleshooting

### Services Not Starting

```bash
# Check logs
docker compose logs backend
docker compose logs frontend

# Check Docker status
systemctl status docker

# Restart Docker
sudo systemctl restart docker
```

### SSL Issues

```bash
# Verify certificate
openssl x509 -in nginx/ssl/certificate.crt -text -noout

# Check certificate expiry
openssl x509 -enddate -noout -in nginx/ssl/certificate.crt

# Renew certificate
sudo certbot renew --force-renewal
```

### High Memory Usage

```bash
# Check memory
free -h
docker stats

# Restart services
docker compose restart
```

### WebSocket Connection Failures

```bash
# Check agent endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" wss://agent.kissan.ai/ws

# Check backend logs
docker compose logs -f backend | grep WebSocket
```

---

## 📞 Emergency Procedures

### Complete System Restart

```bash
# Stop all services
docker compose down

# Clean everything
docker system prune -a --volumes -f

# Restart
docker compose up -d --build
```

### Emergency Rollback

```bash
# Use previous stable image
docker compose down
git checkout <stable-commit>
docker compose up -d
```

---

## 📋 Post-Deployment Checklist

- [ ] All services running (`docker compose ps`)
- [ ] Backend health check passes
- [ ] Frontend accessible via HTTPS
- [ ] SSL certificate valid
- [ ] Language selector works
- [ ] Chat functionality tested
- [ ] Mobile responsiveness verified
- [ ] PWA installation tested
- [ ] Location permission works
- [ ] Logs are being written
- [ ] Auto-renewal configured
- [ ] Monitoring script running
- [ ] Firewall enabled
- [ ] Backup strategy in place

---

## 🎯 Production Testing

```bash
# Test API
curl https://kissan.ai/api/health

# Test chat
curl -X POST https://kissan.ai/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","language":"en"}'

# Load test (optional)
# Install Apache Bench
sudo apt install apache2-utils -y

# Test
ab -n 1000 -c 10 https://kissan.ai/
```

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Guide](https://letsencrypt.org/getting-started/)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Deployment Complete! 🎉**

Your Kissan AI platform is now live and ready to serve farmers across India.
