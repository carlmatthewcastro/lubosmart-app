# LubosMart Deployment Guide

This guide explains how to make code changes on your Windows computer, publish them to GitHub, and deploy them to the Azure VM.

## Production setup

- **Live website:** <https://lubosmart.app>
- **Azure VM:** `lubosmart` (Ubuntu; public IP `52.140.199.5`)
- **Production branch:** `main`
- **GitHub repository:** `carlmatthewcastro/lubosmart-app`
- **Application:** Laravel 12, React/Inertia, PHP 8.3, Docker Compose
- **Web server and HTTPS:** Caddy, with certificates managed automatically
- **Database:** MySQL in Docker Compose

The Azure VM runs the live website. XAMPP is only for local development; it does not need to be running for the Azure site to work.

Deployments are **manual**: merging code into GitHub `main` does not update Azure by itself. The VM gets the new version only after you connect to it and pull `main`.

## Deploying a code change

### 1. Make and check the change in VS Code

Work in the project folder:

```text
C:\xampp\htdocs\lubosmart-app
```

Use a feature branch for a change, and run the relevant local checks before publishing. For example:

```powershell
git status
git switch -c feat/short-description
```

If you are already on a feature branch, keep using it rather than creating another one. Do not edit production files directly on the VM.

### 2. Push the branch to GitHub

Review the files before staging them:

```powershell
git status
git add <files-you-intended-to-change>
git status
git commit -m "Describe the change"
git push -u origin <your-branch>
```

Create a pull request from your feature branch into `main`. Review it, run any required checks, and merge it when ready. Do not commit `.env`, passwords, API keys, private keys, or other secrets.

### 3. Deploy the merged `main` to Azure

Connect to the VM from Windows PowerShell. Use the private-key path from your own computer; never copy the key into the repository or send it to anyone.

```powershell
ssh -i "C:\path\to\your\lubosmart_key.pem" azureuser@52.140.199.5
```

In the SSH session, run:

```bash
cd ~/lubosmart-app
git status --short
git branch --show-current
git switch main
git pull --ff-only origin main
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

If `git status --short` shows unexpected changes, stop and investigate before switching branches or pulling. Do not discard production files to force an update.

Confirm that `app`, `db`, and `caddy` are running and that `db` becomes `healthy`. Then check the public site:

```bash
curl -I https://lubosmart.app
```

A successful response is usually `HTTP/2 200`, `HTTP/1.1 200`, or a redirect such as `301` or `302`.

### 4. Run database migrations when needed

If the change adds or updates Laravel database migrations, back up the database first, then run:

```bash
docker compose exec app php artisan migrate --force
```

Do not reverse or delete production data to fix a failed migration. Stop and inspect the error first. A code rollback does not automatically undo a database migration.

For code-only changes with no new migrations, this step is not normally needed.

## Updating production environment settings

There are two separate environment files:

- The local `.env` on your Windows computer is for local development.
- The production `.env` at `~/lubosmart-app/.env` on the Azure VM controls the live site.

Never commit either populated `.env` file. On the VM, edit production settings with:

```bash
cd ~/lubosmart-app
nano .env
chmod 600 .env
```

After changing application environment settings, recreate the app container so it reads the updated values:

```bash
docker compose up -d --force-recreate app
```

The production app key and database passwords are secrets. Do not regenerate the app key on a live installation; doing so can make existing encrypted data unreadable and invalidate sessions. Do not casually change database passwords: MySQL's existing data volume keeps its initialized credentials.

## Starting and stopping the Azure VM

In the Azure Portal, open **Virtual machines > lubosmart > Overview**:

- Select **Start** to bring the VM online. Docker Compose services are configured to restart after VM startup.
- Select **Stop** when you intentionally want the site offline. Confirm the VM becomes **Stopped (deallocated)** if you want compute billing to stop.

Managed disks and some other resources may continue to incur charges while the VM is deallocated. Check **Cost Management > Cost analysis** regularly. Starting or stopping the VM does not delete the database volume.

## DNS and HTTPS

Cloudflare DNS should point the domain to the Azure public IP:

- `A` record: `@` → `52.140.199.5`
- `CNAME` record: `www` → `lubosmart.app`

Caddy obtains and renews HTTPS certificates automatically. Keep inbound **TCP 80** and **TCP 443** allowed in the Azure Network Security Group. MySQL port **3306 must not be opened to the public internet**. The Caddy data volume stores certificate state; do not remove it.

If DNS records are changed, allow time for DNS propagation. Keep Cloudflare records DNS-only while diagnosing certificate issues.

## Health checks and troubleshooting

Run these commands on the Azure VM from `~/lubosmart-app`:

```bash
docker compose ps
curl -I https://lubosmart.app
docker compose logs --tail=100 app
docker compose logs --tail=100 caddy
docker compose logs --tail=100 db
```

Share only relevant, redacted error lines when asking for help. Logs and screenshots can contain personal information or session data.

- **Website does not open:** check that the VM is Running, DNS resolves to the VM IP, and TCP 80/443 are allowed.
- **502/503 response:** check `docker compose ps` and the app logs.
- **Certificate error:** verify both DNS records, public IP, and TCP 80/443 reachability; allow time for certificate issuance.
- **Database connection error:** check that `db` is healthy and the production `.env` has `DB_HOST=db`. Do not paste the `.env` into chat.

## Database and storage safety

Docker Compose stores the MySQL database, uploaded application files, and Caddy certificate data in named persistent volumes. Keep those volumes when updating or restarting containers.

**Never run `docker compose down -v` on production.** The `-v` option deletes named volumes, including the production database and uploaded files.

Before risky database or infrastructure changes, create and verify a backup stored somewhere other than the VM's Docker volume. A backup kept only on the VM can be lost with the VM or disk.
