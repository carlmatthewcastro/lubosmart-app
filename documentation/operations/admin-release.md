# Admin workspace release (2026-10-10)

This release includes the account, registration, email security, and admin changes developed together. It includes four new migrations, not just visual changes. Keep the existing production database, admin account, APP_KEY, and database passwords.

## Production .env

In your VM SSH session:

```bash
cd ~/lubosmart-app
nano .env
```

Check these values. Add a missing setting or correct a different value; do not overwrite working credentials with placeholders:

```dotenv
APP_NAME="LubosMart"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://lubosmart.app
LOG_LEVEL=warning
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
SESSION_DOMAIN=null
CACHE_STORE=database
QUEUE_CONNECTION=database
MAIL_MAILER=smtp
MAIL_SECURITY_MAILER=smtp
MAIL_FROM_NAME="LubosMart"
MAIL_REPLY_TO_NAME="LubosMart Support"
MAIL_LOGO_URL=https://lubosmart.app/email-logo.png
GOOGLE_REDIRECT_URI=https://lubosmart.app/auth/google/callback
```

Keep the current APP_TIMEZONE for this release: changing it while existing timestamps are stored needs a separate review. Keep APP_KEY, DB_DATABASE, DB_USERNAME, DB_PASSWORD, DB_ROOT_PASSWORD, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET as they are.

MAIL_SECURITY_MAILER is used for email verification and password-change confirmation. For an existing working Gmail setup, use MAIL_SCHEME=smtp, MAIL_HOST=smtp.gmail.com, MAIL_PORT=587, MAIL_ENCRYPTION=tls. Preserve MAIL_USERNAME and MAIL_PASSWORD (Gmail app password). Use the authenticated mailbox for MAIL_FROM_ADDRESS and MAIL_REPLY_TO_ADDRESS. Other SMTP providers should retain their own working host, port, scheme, sender, and credentials. A populated MAIL_URL overrides the separate SMTP fields; retain it if correct, or remove a stale value before switching to individual fields. Never use the log or array mailer for production security codes.

Save in nano with Ctrl+O, Enter, Ctrl+X. Run chmod 600 .env. No environment variable is needed for the floating inbox, sidebar, or editable commission. The commission is stored through the admin UI.

## Deploy the published main branch

Run from the existing VM checkout. If git status shows unexpected edits, resolve them before pulling. Stop on any failed command. Rebuilding creates the frontend assets inside Docker; no npm installation on the VM is required.

```bash
cd ~/lubosmart-app
git status --short
git branch --show-current
git switch main
git pull --ff-only origin main
nano .env
chmod 600 .env
docker compose config --quiet
docker compose build app
```

Back up the existing database and uploaded files before migrations. The following commands keep credentials inside the container and produce backups outside Docker volumes. Verify both commands succeed and the archives contain data, then copy the backups to a separate secure location.

```bash
mkdir -p ~/lubosmart-backups
chmod 700 ~/lubosmart-backups
release_stamp=$(date -u +%Y%m%dT%H%M%SZ)
docker compose exec -T db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers --no-tablespaces "$MYSQL_DATABASE"' > ~/lubosmart-backups/database-$release_stamp.sql
docker compose exec -T app tar -czf - -C /var/www/html storage/app > ~/lubosmart-backups/uploads-$release_stamp.tar.gz
chmod 600 ~/lubosmart-backups/*
test -s ~/lubosmart-backups/database-$release_stamp.sql
gzip -t ~/lubosmart-backups/uploads-$release_stamp.tar.gz
```

Install the new image while the shared storage keeps the site in maintenance mode. Keep queue workers stopped until the new schema is ready:

```bash
docker compose exec app php artisan down --retry=60
docker compose stop queue
docker compose up -d --no-deps --force-recreate app
docker compose exec app php artisan optimize:clear
docker compose exec app php artisan migrate --force
docker compose exec app php artisan optimize
docker compose exec app php artisan lubosmart:mail-status --check-connection
docker compose up -d --no-deps --force-recreate queue
docker compose exec app php artisan up
docker compose ps
curl -I https://lubosmart.app
```

If migration or mail checks fail, keep maintenance mode enabled, inspect the failure, and fix it before running artisan up. Do not run migrate:fresh, rollback, the generic database seeder, the testing-account command, or docker compose down -v on production. These lifecycle migrations normalize legacy roles and account statuses and include forward-only changes; a code rollback alone does not undo them.

Verify existing admin login, registration reviews, the sidebar edge control, floating messages, content drafts/publication, and a password-change email code. The panel refreshes every 30 seconds while open and the browser tab is visible. No websocket server or extra service is needed.

[Deployment guide](deployment.md) | [Admin workspace](admin-workspace.md)
