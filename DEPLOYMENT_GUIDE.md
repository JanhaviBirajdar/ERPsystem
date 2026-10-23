# Commercial Deployment & Hosting Guide: Multi-Tenant College ERP

This guide provides end-to-end instructions for deploying the Multi-Tenant College ERP platform to production on Linux (Ubuntu 22.04 / 24.04 LTS), Docker, or cloud virtual machines (AWS EC2, DigitalOcean, Hetzner, GCP Compute).

---

## 1. System Architecture Overview

```text
               [ Internet Clients / Browsers ]
                             │
                             ▼
                 [ Cloudflare / Route 53 ]
               (Wildcard DNS: *.campuserp.io)
                             │
                             ▼
         [ Nginx Reverse Proxy + Let's Encrypt SSL ]
      (Port 80/443: Subdomain Routing, Rate Limiting, CSP)
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
      [ Node.js Backend API ]  [ Static Client Assets ]
       (Express Port 5000)       (/var/www/erp/client/dist)
                 │
        ┌────────┴────────┐
        ▼                 ▼
   [ SQLite WAL ]   [ Document Store ]
   (Relational DB)   (mongo_store.json)
        │                 │
        └────────┬────────┘
                 ▼
      [ Backup Service & S3 Archive ]
```

---

## 2. Server Prerequisites

- **OS:** Ubuntu 22.04 LTS or 24.04 LTS (x86_64 or ARM64)
- **CPU / RAM:** Minimum 2 vCPU, 4 GB RAM (Recommended 4 vCPU, 8 GB RAM for > 2,000 active students)
- **Disk:** Minimum 40 GB NVMe SSD (with automated weekly snapshot retention)
- **Node.js:** Node.js v18.x, v20.x, or v22.x LTS
- **Web Server:** Nginx 1.20+ with HTTP/2 and Certbot for SSL/TLS

---

## 3. Production Environment Configuration

1. Copy the production environment template:
   ```bash
   cp server/.env.example server/.env
   chmod 600 server/.env
   ```

2. Generate cryptographically strong secrets:
   ```bash
   # Generate 64-character random secrets
   node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
   node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
   node -e "console.log('BILLING_HMAC_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Populate `server/.env` with production values:
   ```ini
   NODE_ENV=production
   PORT=5000
   CORS_ORIGIN=https://campuserp.io,https://*.campuserp.io
   BASE_DOMAIN=campuserp.io
   
   # Cryptographic Authentication
   JWT_SECRET=your_generated_jwt_secret_minimum_32_characters_here
   SESSION_SECRET=your_generated_session_secret_minimum_32_characters_here
   ENCRYPTION_KEY=your_generated_encryption_key_minimum_32_characters_here
   
   # Payment Gateway Integration
   BILLING_HMAC_SECRET=your_billing_hmac_secret_minimum_32_characters_here
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   RAZORPAY_KEY_ID=rzp_live_...
   RAZORPAY_KEY_SECRET=your_razorpay_secret...
   
   # AI Campus Copilot Provider (Optional)
   GEMINI_API_KEY=AIzaSy...
   OPENAI_API_KEY=sk-...
   
   # Storage & Backup Paths
   BACKUP_DIR=/var/backups/campuserp
   BACKUP_RETENTION_DAYS=30
   ```

---

## 4. Building the Production Assets

```bash
# 1. Install server dependencies
cd server
npm ci --omit=dev

# 2. Install client dependencies and compile production bundle
cd ../client
npm ci
npm run build

# 3. Verify tests pass prior to launching
cd ..
npm test
```

---

## 5. Process Management with PM2 (Bare Metal / VM)

Install PM2 globally to maintain high-availability daemon processes with automatic restart:

```bash
sudo npm install -g pm2

# Start the ERP server under PM2
pm2 start server/index.js --name "college-erp-api" \
  --max-memory-restart 1G \
  --time \
  --env NODE_ENV=production

# Save PM2 process list and configure startup on boot
pm2 save
pm2 startup systemd
```

---

## 6. Docker & Docker Compose Deployment

A containerized deployment ensures reproducible runtime environments.

### `Dockerfile`
```dockerfile
# Multi-stage Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client ./client
RUN cd client && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev
COPY server ./server
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/health/ready || exit 1

CMD ["node", "server/index.js"]
```

### `docker-compose.yml`
```yaml
version: '3.8'

services:
  erp-app:
    build: .
    container_name: college_erp_saas
    restart: unless-stopped
    ports:
      - "127.0.0.1:5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - server/.env
    volumes:
      - erp_data:/app/server/db
      - erp_backups:/app/server/backups
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2048M

volumes:
  erp_data:
  erp_backups:
```

---

## 7. Nginx Reverse Proxy with Wildcard SSL/TLS & Subdomain Routing

This configuration handles wildcard domain routing (`*.campuserp.io`), terminates SSL, enforces HTTP Strict Transport Security (HSTS), and proxies API traffic with WebSocket headers.

`/etc/nginx/sites-available/campuserp.conf`:
```nginx
# Upstream Node.js server pool
upstream erp_backend {
    server 127.0.0.1:5000;
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name campuserp.io *.campuserp.io;
    return 301 https://$host$request_uri;
}

# HTTPS Primary Virtual Host
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name campuserp.io *.campuserp.io;

    # SSL Certificates (Let's Encrypt Wildcard)
    ssl_certificate /etc/letsencrypt/live/campuserp.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/campuserp.io/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Hardened Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Client Static Assets
    root /var/www/erp/client/dist;
    index index.html;

    # Proxy API Traffic to Node.js Backend
    location /api/ {
        proxy_pass http://erp_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Single Page Application (SPA) Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 8. Automated Backup & Tested Recovery Procedures

### 1. Automated Cron Schedule
Configure a nightly backup cron job that creates SHA-256 integrity-verified snapshots:

```bash
# Open root crontab
sudo crontab -e

# Execute snapshot backup daily at 02:00 AM UTC
0 2 * * * /usr/bin/node /var/www/erp/server/scripts/backup.js >> /var/log/erp-backup.log 2>&1
```

### 2. Manual Backup Trigger
```bash
node server/scripts/backup.js
# Output:
# Snapshot ID: backup_2026-10-23T16-28-17-546Z_88416b
# SQLite SHA-256: 7659d854a43f169ad1cbab3e...
# Mongo SHA-256:  73df23662d713754cc462fbf...
```

### 3. Tested Disaster Recovery Execution
To restore the platform from an archive snapshot:

```bash
node server/scripts/restore.js <snapshot-id>
# Example:
node server/scripts/restore.js backup_2026-10-23T16-28-17-546Z_88416b
```
The script performs:
1. Manifest verification and checksum matching.
2. Pre-restore safety backup of active database files.
3. Hot atomic file restoration.
4. SQLite `PRAGMA integrity_check` (guaranteeing 0 database corruption).

---

## 9. Observability & Healthcheck Monitoring

Configure your external monitoring system (Datadog, UptimeRobot, Prometheus, or AWS Route 53 Health Checks) to poll the following endpoints:

| Endpoint | Probe Type | Expected HTTP Status | Description |
|:---|:---|:---:|:---|
| `GET /api/health` | Liveness | `200 OK` | Verifies Express event loop responsiveness. |
| `GET /api/health/ready` | Readiness | `200 OK` | Validates SQLite WAL connection & document store disk writeability. |
| `GET /api/health/deep` | Deep Diagnostics | `200 OK` | Reports memory consumption, uptime, database integrity status, and record counts. |

Sample response from `/api/health/deep`:
```json
{
  "status": "HEALTHY",
  "service": "Modern College ERP SaaS",
  "version": "2.4.0",
  "uptimeSeconds": 1420,
  "memoryUsageMB": {
    "rss": 78.4,
    "heapTotal": 42.1,
    "heapUsed": 28.6
  },
  "database": {
    "sqlite": { "status": "CONNECTED", "integrity": "PASSED_OK" },
    "documentStore": { "status": "READY", "institutionsCount": 4, "usersCount": 86 }
  }
}
```
