# Government Disbursement System - Deployment Guide

**Version:** 1.0
**Date:** January 3, 2026
**Status:** Production Ready

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Installation Steps](#installation-steps)
4. [Database Setup](#database-setup)
5. [Application Configuration](#application-configuration)
6. [Web Server Configuration](#web-server-configuration)
7. [SSL/TLS Setup](#ssltls-setup)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Hardware Requirements

**Minimum (Small to Medium Agency):**
- CPU: 4 cores (2.0 GHz or higher)
- RAM: 8 GB
- Storage: 100 GB SSD
- Network: 100 Mbps

**Recommended (Large Agency):**
- CPU: 8 cores (2.5 GHz or higher)
- RAM: 16 GB
- Storage: 250 GB SSD (RAID 1 for redundancy)
- Network: 1 Gbps

### Software Requirements

**Operating System:**
- Ubuntu 22.04 LTS (recommended)
- Ubuntu 20.04 LTS
- Debian 11 or higher
- Windows Server 2019/2022 (supported but not recommended)

**Runtime Environment:**
- Node.js 18.x or 20.x LTS
- npm 9.x or higher

**Database:**
- MySQL 8.0 or higher
- MariaDB 10.6 or higher

**Web Server:**
- Nginx 1.18 or higher (recommended)
- Apache 2.4 or higher (alternative)

**Additional Software:**
- Git 2.x
- PM2 (process manager)
- Certbot (for SSL certificates)

---

## Pre-Deployment Checklist

### Before You Begin

- [ ] Server with root/sudo access
- [ ] Domain name configured (e.g., gds.agency.gov.ph)
- [ ] DNS records pointing to server IP
- [ ] SSL certificate or plan to use Let's Encrypt
- [ ] Database server installed and running
- [ ] Email server credentials (SMTP)
- [ ] Backup strategy in place

### Security Checklist

- [ ] Firewall configured (UFW on Ubuntu)
- [ ] SSH key-based authentication enabled
- [ ] Root login disabled
- [ ] Non-root user created for deployment
- [ ] Fail2ban installed (optional but recommended)
- [ ] Server timezone set correctly

---

## Installation Steps

### Step 1: Prepare the Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required dependencies
sudo apt install -y build-essential curl git nginx mysql-server

# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version  # Should be v20.x.x
npm --version   # Should be 9.x.x or higher
mysql --version # Should be 8.0 or higher
```

### Step 2: Create Deployment User

```bash
# Create dedicated user for the application
sudo adduser --system --group --shell /bin/bash gds

# Add user to necessary groups
sudo usermod -aG www-data gds
```

### Step 3: Set Up Application Directory

```bash
# Switch to deployment user
sudo su - gds

# Create application directory
mkdir -p /var/www/gds
cd /var/www/gds

# Clone the repository (replace with your repository URL)
git clone https://github.com/your-agency/disbursement-system.git .

# Or upload files via SCP/SFTP
# scp -r ./dist gds@server:/var/www/gds/
```

### Step 4: Install Application Dependencies

```bash
# Install Node.js dependencies
npm ci --production

# Build the application
npm run build

# The build output will be in the dist/ directory
```

### Step 5: Install Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'gds',
    script: './dist/server/entry.mjs',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '127.0.0.1'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
EOF

# Create logs directory
mkdir -p logs

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions printed by the command above
```

---

## Database Setup

### Step 1: Secure MySQL Installation

```bash
# Run MySQL secure installation
sudo mysql_secure_installation

# Follow prompts:
# - Set root password: YES
# - Remove anonymous users: YES
# - Disallow root login remotely: YES
# - Remove test database: YES
# - Reload privilege tables: YES
```

### Step 2: Create Database and User

```bash
# Login to MySQL as root
sudo mysql -u root -p

# Run the following SQL commands:
```

```sql
-- Create database
CREATE DATABASE gds_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create database user
CREATE USER 'gds_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON gds_production.* TO 'gds_user'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

### Step 3: Run Database Migrations

```bash
# Navigate to application directory
cd /var/www/gds

# Create .env file (see Configuration section)
nano .env

# Run database migrations
npm run db:push

# Or if using migration files
npm run db:migrate
```

### Step 4: Seed Initial Data

```bash
# Create initial admin user
npm run db:seed

# Or manually create admin user
node scripts/create-admin.js
```

**Default Admin Credentials:**
- Username: `admin`
- Password: `Admin123!` (CHANGE IMMEDIATELY after first login)

---

## Application Configuration

### Environment Variables

Create `.env` file in the application root:

```bash
cd /var/www/gds
nano .env
```

```env
# Application
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
APP_URL=https://gds.agency.gov.ph

# Database
DATABASE_URL=mysql://gds_user:your_secure_password_here@localhost:3306/gds_production

# Session
SESSION_SECRET=your_very_long_random_secret_here_at_least_32_characters

# Security
CSRF_SECRET=another_long_random_secret_for_csrf_tokens_32_characters
RATE_LIMIT_ENABLED=true

# Email (SMTP Configuration)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@agency.gov.ph
SMTP_PASSWORD=your_smtp_password
SMTP_FROM_NAME=Government Disbursement System
SMTP_FROM_EMAIL=noreply@agency.gov.ph

# File Upload
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=/var/www/gds/uploads

# Logging
LOG_LEVEL=info
LOG_FILE=/var/www/gds/logs/application.log

# Timezone
TZ=Asia/Manila
```

### Generate Secure Secrets

```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Use output for SESSION_SECRET

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Use output for CSRF_SECRET
```

### File Permissions

```bash
# Set ownership
sudo chown -R gds:www-data /var/www/gds

# Set directory permissions
sudo find /var/www/gds -type d -exec chmod 755 {} \;

# Set file permissions
sudo find /var/www/gds -type f -exec chmod 644 {} \;

# Make .env file readable only by owner
chmod 600 /var/www/gds/.env

# Create and set permissions for uploads directory
mkdir -p /var/www/gds/uploads
sudo chown -R gds:www-data /var/www/gds/uploads
chmod 755 /var/www/gds/uploads
```

---

## Web Server Configuration

### Nginx Configuration (Recommended)

Create Nginx site configuration:

```bash
sudo nano /etc/nginx/sites-available/gds
```

```nginx
# Upstream Node.js application
upstream gds_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name gds.agency.gov.ph;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name gds.agency.gov.ph;

    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/letsencrypt/live/gds.agency.gov.ph/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gds.agency.gov.ph/privkey.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Client Body Size (for file uploads)
    client_max_body_size 10M;

    # Logs
    access_log /var/log/nginx/gds-access.log;
    error_log /var/log/nginx/gds-error.log;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Root directory for static files
    root /var/www/gds/dist/client;

    # Static files (served directly by Nginx)
    location /_astro/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /uploads/ {
        alias /var/www/gds/uploads/;
        expires 1y;
        add_header Cache-Control "public";
    }

    # API and dynamic routes (proxy to Node.js)
    location / {
        proxy_pass http://gds_backend;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable the site and restart Nginx:

```bash
# Create symlink to enable site
sudo ln -s /etc/nginx/sites-available/gds /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# If test passes, restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

### Apache Configuration (Alternative)

If using Apache instead of Nginx:

```bash
sudo nano /etc/apache2/sites-available/gds.conf
```

```apache
<VirtualHost *:80>
    ServerName gds.agency.gov.ph

    # Redirect to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>

<VirtualHost *:443>
    ServerName gds.agency.gov.ph

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/gds.agency.gov.ph/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/gds.agency.gov.ph/privkey.pem

    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"

    # Proxy to Node.js
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    # Logs
    ErrorLog ${APACHE_LOG_DIR}/gds-error.log
    CustomLog ${APACHE_LOG_DIR}/gds-access.log combined
</VirtualHost>
```

Enable modules and site:

```bash
sudo a2enmod ssl proxy proxy_http headers rewrite
sudo a2ensite gds
sudo systemctl restart apache2
```

---

## SSL/TLS Setup

### Using Let's Encrypt (Free, Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate (for Nginx)
sudo certbot --nginx -d gds.agency.gov.ph

# Or for Apache
sudo certbot --apache -d gds.agency.gov.ph

# Follow the prompts:
# - Enter email address
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (choose Yes)

# Test automatic renewal
sudo certbot renew --dry-run

# Certbot will automatically set up a cron job for renewal
```

### Using Custom SSL Certificate

If you have a purchased SSL certificate:

```bash
# Copy certificate files to server
sudo mkdir -p /etc/ssl/gds
sudo cp your-certificate.crt /etc/ssl/gds/certificate.crt
sudo cp your-private-key.key /etc/ssl/gds/private.key
sudo cp your-ca-bundle.crt /etc/ssl/gds/ca-bundle.crt

# Set permissions
sudo chmod 600 /etc/ssl/gds/private.key
sudo chmod 644 /etc/ssl/gds/certificate.crt
sudo chmod 644 /etc/ssl/gds/ca-bundle.crt

# Update Nginx configuration to point to these files
# Then restart Nginx
sudo systemctl restart nginx
```

---

## Post-Deployment Verification

### Verification Checklist

```bash
# 1. Check if application is running
pm2 status

# 2. Check application logs
pm2 logs gds --lines 50

# 3. Test database connection
mysql -u gds_user -p gds_production -e "SELECT 1;"

# 4. Check Nginx status
sudo systemctl status nginx

# 5. Test HTTP to HTTPS redirect
curl -I http://gds.agency.gov.ph
# Should return 301 redirect to HTTPS

# 6. Test HTTPS connection
curl -I https://gds.agency.gov.ph
# Should return 200 OK

# 7. Check SSL certificate
sudo certbot certificates

# 8. Verify security headers
curl -I https://gds.agency.gov.ph | grep -i "strict-transport-security\|x-frame-options\|x-content-type"
```

### Functional Tests

1. **Login Test:**
   - Navigate to https://gds.agency.gov.ph/login
   - Login with admin credentials
   - Verify successful login

2. **Create Test Disbursement:**
   - Create a test DV
   - Verify it appears in the list
   - Test approval workflow

3. **Upload Test:**
   - Try uploading a document
   - Verify file is saved correctly

4. **Report Test:**
   - Generate a test report
   - Verify report displays correctly

### Security Verification

```bash
# Run SSL Labs test
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=gds.agency.gov.ph
# Should get A or A+ rating

# Check for open ports
sudo netstat -tulpn | grep LISTEN
# Should only show: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3306 (MySQL on localhost only)

# Verify firewall rules
sudo ufw status
# Should show:
# 22/tcp ALLOW (SSH)
# 80/tcp ALLOW (HTTP)
# 443/tcp ALLOW (HTTPS)
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs gds --err

# Common issues:
# 1. Port already in use
sudo lsof -i :3000
# Kill process if needed

# 2. Database connection error
# - Verify DATABASE_URL in .env
# - Test MySQL connection
mysql -u gds_user -p

# 3. Missing dependencies
npm ci --production

# 4. Permission issues
sudo chown -R gds:www-data /var/www/gds
```

### Nginx 502 Bad Gateway

```bash
# Check if Node.js app is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/gds-error.log

# Restart services
pm2 restart gds
sudo systemctl restart nginx
```

### Database Connection Issues

```bash
# Verify MySQL is running
sudo systemctl status mysql

# Test connection
mysql -u gds_user -p gds_production

# Check MySQL error log
sudo tail -f /var/log/mysql/error.log

# Reset user password if needed
sudo mysql -u root -p
# Then run: ALTER USER 'gds_user'@'localhost' IDENTIFIED BY 'new_password';
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check certificate files exist
ls -la /etc/letsencrypt/live/gds.agency.gov.ph/

# Test Nginx configuration
sudo nginx -t
```

### Performance Issues

```bash
# Check server resources
htop
df -h
free -m

# Check Node.js process memory
pm2 monit

# Restart application to free memory
pm2 restart gds

# Check slow query log
sudo mysql -u root -p -e "SHOW VARIABLES LIKE 'slow_query%';"
```

---

## Maintenance Commands

```bash
# View application logs
pm2 logs gds

# Restart application
pm2 restart gds

# Stop application
pm2 stop gds

# Start application
pm2 start gds

# View application status
pm2 status

# Monitor resources
pm2 monit

# Reload Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View Nginx access logs
sudo tail -f /var/log/nginx/gds-access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/gds-error.log

# View MySQL slow query log
sudo tail -f /var/log/mysql/mysql-slow.log
```

---

## Next Steps

After successful deployment:

1. [ ] Change default admin password
2. [ ] Create user accounts for staff
3. [ ] Configure COA settings
4. [ ] Set up fund sources and budgets
5. [ ] Configure email notifications
6. [ ] Set up automated backups (see [BACKUP-RECOVERY.md](./BACKUP-RECOVERY.md))
7. [ ] Configure monitoring (see [MONITORING-LOGGING.md](./MONITORING-LOGGING.md))
8. [ ] Train users (see [TRAINING-MATERIALS.md](./TRAINING-MATERIALS.md))
9. [ ] Schedule regular maintenance

---

## Support

For technical support:
- Email: support@agency.gov.ph
- Documentation: https://gds.agency.gov.ph/docs
- Issue Tracker: https://github.com/your-agency/disbursement-system/issues

---

**Document Version:** 1.0
**Last Updated:** January 3, 2026
**Prepared By:** Development Team
