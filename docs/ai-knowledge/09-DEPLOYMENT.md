# 09 — Deployment & Hosting Constraints

## 1. Target Environment: Shared Hosting
Angora Work OS is engineered to deploy seamlessly to **shared cPanel / LiteSpeed / Apache hosting** without requiring specialized infrastructure or elevated permissions.

---

## 2. Infrastructure Requirements & Constraints

| Component | Shared Hosting Strategy | What is PROHIBITED |
| :--- | :--- | :--- |
| **PHP Runtime** | PHP 8.2 or 8.3 with standard extensions (pdo, mbstring, openssl, tokenizer, xml, ctype, json, fileinfo) | Requiring custom PHP extensions or root-level daemons |
| **Cache Store** | `CACHE_STORE=file` or `CACHE_STORE=database` | **No Redis / Memcached** |
| **Session Driver** | `SESSION_DRIVER=database` or `SESSION_DRIVER=file` | **No Redis** |
| **Queue Driver** | `QUEUE_CONNECTION=sync` or `QUEUE_CONNECTION=database` | **No Redis / Horizon** |
| **Task Scheduling** | Standard cPanel cron calling `php artisan schedule:run` every minute | Requiring persistent Node / Python background processes |
| **Web Server** | Apache (`.htaccess`) or LiteSpeed with `public/` web root | Requiring Nginx custom reverse proxies for core function |

---

## 3. Standard Deployment Commands
When deploying updates to production:

```bash
# 1. Update codebase
git pull origin master

# 2. Install PHP production dependencies (no dev packages)
composer install --no-dev --optimize-autoloader

# 3. Run database migrations
php artisan migrate --force

# 4. Optimize Laravel caches
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 5. Build production frontend assets (if building on server, or upload build/)
npm ci
npm run build
```

---

## 4. Production Cron Configuration
Set up a single cron entry in cPanel:
```bash
* * * * * cd /home/username/public_html && php artisan schedule:run >> /dev/null 2>&1
```
This handles:
- Task recurrence rule evaluation (`php artisan kanban:process-recurrence`).
- Upcoming deadline notifications and warnings.
- Expired user invitation cleanups.

---

## 5. Key Cross-References
- Shared hosting architectural decision: [[decisions/ADR-005-shared-hosting-zero-redis-production-architecture]]
- Architecture overview: [[02-ARCHITECTURE]]
