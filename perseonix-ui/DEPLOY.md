# Deploy — local → your server, one command

**Model:** your server runs the live app (production). You keep developing on your Mac.
When you're happy with local changes, one command ships them to the server.

```
npm run ship "what I changed"
```

That command: commits your changes → pushes to GitHub → the server pulls, rebuilds,
and restarts. DB migrations apply automatically on that restart.

---

## One-time setup

### A) On your Mac (once)
1. Make sure you can SSH into the server without a password (key-based login):
   ```bash
   ssh-keygen -t ed25519            # if you don't already have a key (press Enter through prompts)
   ssh-copy-id user@YOUR_SERVER_IP  # copies your key to the server
   ```
2. Create `.env.deploy` in the project root (it is git-ignored, stays local):
   ```
   DEPLOY_HOST=user@YOUR_SERVER_IP
   DEPLOY_PATH=/opt/perseonix-ui
   ```

### B) On the server (once)
1. Install Node 20+ and PM2, and git:
   ```bash
   # Node 20/22/24 via your distro or nvm, then:
   npm install -g pm2
   ```
2. Clone the repo to the path you put in `DEPLOY_PATH`:
   ```bash
   sudo mkdir -p /opt/perseonix-ui && sudo chown "$USER" /opt/perseonix-ui
   git clone https://github.com/Faridhuseynli2/perseonix-ui.git /opt/perseonix-ui
   cd /opt/perseonix-ui
   ```
3. Create `.env.local` (secrets — never committed). At minimum:
   ```
   # keep the DB OUTSIDE the repo so deploys never wipe it
   PGLITE_DATA_DIR=/opt/perseonix-data/pglite
   # a long random string — used to encrypt ingestion keys at rest
   INGEST_KEY_SECRET=<paste a long random value>
   # add any other keys you use (HIBP, etc.)
   ```
   ```bash
   mkdir -p /opt/perseonix-data/pglite
   ```
4. First build + start:
   ```bash
   npm ci
   npm run build
   pm2 startOrReload ecosystem.config.cjs --update-env
   pm2 save
   pm2 startup     # run the line it prints, so the app restarts after a reboot
   ```
   The app now serves on port **3000**. Put Nginx/Caddy in front for a domain + HTTPS
   (optional; ask when you want it).

---

## Daily use (from your Mac)
```bash
npm run ship "added corroboration + fixed filters"
```
Done — your changes are live on the server in one command.

## Notes
- **Database persistence:** the DB lives at `PGLITE_DATA_DIR` (outside the repo), so
  `git pull` / rebuilds never touch it. New tables/columns you add locally apply on the
  server automatically at the restart (migrations run at boot).
- **n8n on the server:** point your playbooks' POST URL at the server app
  (`http://localhost:3000/api/ingest/v1/...` if n8n runs on the same box, or the server IP).
- **Secrets** stay in `.env.local` on each machine (git-ignored) — never in GitHub.
- **Rollback:** on the server, `git log` → `git checkout <old-commit>` → `bash scripts/deploy.sh`.
