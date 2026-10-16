# Angora Work OS — Production Deployment Guide
## Single VPS Architecture: Laravel 12 + Reverb WebSockets + S3 Object Storage

This deployment architecture is tailored for cost efficiency and high reliability on a single VPS (such as Hetzner, DigitalOcean, Linode, or AWS Lightsail), easily accommodating:
- ~100 registered accounts
- ~10 continuously active internal collaborators
- External clients reviewing deliverables and approving tasks
- Real-time WebSockets, background queues, and automatic image optimization

---

## 1. Hardware Sizing & Recommended Specifications

| Workload Tier | Recommended Specs | Indicative Cost |
| :--- | :--- | :--- |
| **Initial Production** | 2 vCPUs (AMD/Intel), 4 GB RAM, 40–80 GB NVMe SSD | ~\$12–\$20 / mo |
| **Scale / Growth** | 4 vCPUs, 8 GB RAM, 160 GB NVMe SSD | ~\$30–\$45 / mo |

---

## 2. Server Prerequisites (Ubuntu 24.04 LTS / Debian 12)

### A. Install Core Packages & PHP 8.4
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y software-properties-common curl git unzip nginx supervisor certbot python3-certbot-nginx

# Add Ondřej Surý PHP PPA
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Install PHP 8.4 and required extensions
sudo apt install -y php8.4-fpm php8.4-cli php8.4-common php8.4-mysql php8.4-mbstring \
    php8.4-xml php8.4-curl php8.4-zip php8.4-gd php8.4-bcmath php8.4-redis \
    php8.4-intl php8.4-pcntl php8.4-fileinfo
```

### B. MariaDB / MySQL Installation
```bash
sudo apt install -y mariadb-server
sudo mysql_secure_installation

# Create Angora database and user
sudo mysql -e "CREATE DATABASE angora CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'angora_user'@'localhost' IDENTIFIED BY 'StrongGeneratedPasswordHere';"
sudo mysql -e "GRANT ALL PRIVILEGES ON angora.* TO 'angora_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

---

## 3. Application Setup

```bash
# Clone repository
sudo mkdir -p /var/www/angora
sudo chown -R $USER:www-data /var/www/angora
git clone https://github.com/your-org/angora.git /var/www/angora
cd /var/www/angora

# Install Composer dependencies
composer install --no-dev --optimize-autoloader

# Install NPM dependencies and build production assets
npm ci
npm run build

# Configure permissions
sudo chown -R www-data:www-data /var/www/angora/storage /var/www/angora/bootstrap/cache
sudo chmod -R 775 /var/www/angora/storage /var/www/angora/bootstrap/cache

# Create storage symbolic link
php artisan storage:link
```

---

## 4. Environment Configuration (`.env`)

```env
APP_NAME="Angora Work OS"
APP_ENV=production
APP_KEY=base64:...
APP_DEBUG=false
APP_URL=https://app.angora.io

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=angora
DB_USERNAME=angora_user
DB_PASSWORD=StrongGeneratedPasswordHere

# Queue & Cache
CACHE_STORE=database
QUEUE_CONNECTION=database
SESSION_DRIVER=database

# Laravel Reverb (WebSockets)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=170283
REVERB_APP_KEY=angora_prod_reverb_key
REVERB_APP_SECRET=angora_prod_reverb_secret
REVERB_HOST="127.0.0.1"
REVERB_PORT=8080
REVERB_SCHEME=http

# Client Vite Configuration (Connects via Nginx HTTPS WSS)
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="app.angora.io"
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME="https"

# S3 / Cloudflare R2 / MinIO Storage
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID="your-s3-access-key"
AWS_SECRET_ACCESS_KEY="your-s3-secret-key"
AWS_DEFAULT_REGION="auto"
AWS_BUCKET="angora-work-os-storage"
AWS_URL="https://storage.angora.io"
# For Cloudflare R2:
AWS_ENDPOINT="https://<accountid>.r2.cloudflarestorage.com"
AWS_USE_PATH_STYLE_ENDPOINT=false
```

Run database migrations:
```bash
php artisan migrate --force
```

---

## 5. Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/angora`:

```nginx
# Map for WebSocket upgrade headers
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name app.angora.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.angora.io;

    root /var/www/angora/public;
    index index.php;

    # SSL Certificates managed via Certbot
    ssl_certificate /etc/letsencrypt/live/app.angora.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.angora.io/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Static Assets Caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|webp|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Laravel Application Router
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP-FPM Handler
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 180;
    }

    # Laravel Reverb WebSocket Proxy
    location /app {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/angora /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Supervisor Daemons (Reverb & Queue Workers)

Create `/etc/supervisor/conf.d/angora.conf`:

```ini
[program:angora-reverb]
process_name=%(program_name)s
command=php /var/www/angora/artisan reverb:start --host=127.0.0.1 --port=8080
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/log/supervisor/angora-reverb.log
stopwaitsecs=3600

[program:angora-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/angora/artisan queue:work database --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/supervisor/angora-worker.log
stopwaitsecs=3600
```

Start the daemons:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all
```

---

## 7. Cron Scheduler

Add Laravel scheduler to www-data crontab (`sudo crontab -u www-data -e`):
```cron
* * * * * cd /var/www/angora && php artisan schedule:run >> /dev/null 2>&1
```

---

## 8. S3 / Cloudflare R2 Bucket CORS & Policy

If serving attachments directly or generating presigned URLs:

### CORS Policy
```json
[
  {
    "AllowedOrigins": ["https://app.angora.io"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 9. Local Storage to S3 Migration

When transitioning existing production data from local storage to S3:

```bash
# 1. Preview eligible files
php artisan storage:migrate-to-s3 --dry-run

# 2. Run idempotent migration
php artisan storage:migrate-to-s3

# 3. Verify in browser that attachments, avatars, and comment images render properly
```
Note: Local copies are preserved intact as a rollback safety measure.
