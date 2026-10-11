# Run NEXA on the web

The current app uses a local SQLite file. Host it as a **single Node server with persistent storage**. Do not deploy this version to Vercel or another ephemeral/multi-instance filesystem: account and student records could be lost or split across instances. This guide is for a development/staging deployment with synthetic data, not production approval.

## Recommended: Render with a persistent disk

1. Sign in to Render and connect GitHub. Grant it access to `dnjswnsx/nexa-platform` (especially if private).
2. Choose **New → Blueprint**, select this repository's `main` branch, and use the included `render.yaml`.
3. Review the paid `starter` web-service plan and 1 GB persistent-disk cost before creating resources. A free service without a disk is not suitable for this SQLite app.
4. Render automatically supplies `RENDER_EXTERNAL_URL`; NEXA uses it to validate requests at the default Render address. No manual `APP_URL` is needed for that address. For a custom domain, set `APP_URL` to its exact HTTPS origin.
5. Optionally add `NEXA_AI_API_KEY` as a secret environment variable for real OpenAI calls. Never use a `NEXT_PUBLIC_` prefix. API project access and billing are required separately from a ChatGPT subscription. No key is needed for exact FAQ lookup or rule-based academy guidance.
6. Deploy. The Blueprint runs `npm ci && npm run build`, then `npm start -- --port $PORT`; records are written to `/var/data/nexa.sqlite` on the mounted disk. Node 24 is selected explicitly.
7. Open the assigned HTTPS URL. Check `/api/health` reports `status: "ok"` and `database: 1`. Visit `/app`, register a synthetic account, create a business, add an FAQ and test the widget. Add synthetic class/student/enrollment and cash records, then restart/redeploy the service and verify they remain.
8. If using AI, ask a paraphrased approved FAQ and request class growth guidance; verify actual API usage and persisted advice. A configured key alone does not prove the integration works.
9. For a custom domain, complete Render's domain/DNS/TLS setup and update `APP_URL` to that origin. Add each external widget website's exact origin under NEXA Settings before embedding.

If configuring a Web Service manually instead of using a Blueprint, use the same runtime, commands, variables and disk settings shown in `render.yaml`. Run one service instance. SQLite migrations apply at application startup; build-time filesystem state is not the mounted runtime disk. Back up using SQLite's online backup API or stop the server and preserve the complete database/WAL state before changes. A persistent disk is not a tested backup strategy.

## Run on your own server

Use a Linux host with Node 24, npm, Python 3, make and a C++ compiler (for the SQLite native module), plus persistent disk:

```sh
git clone https://github.com/dnjswnsx/nexa-platform.git
cd nexa-platform
npm ci
npm run build
export APP_URL=https://your-actual-domain.example
export NEXA_DB_PATH=/absolute/persistent/path/nexa.sqlite
# Inject NEXA_AI_API_KEY through your service's secure environment configuration.
npm start -- --port 3000
```

The placeholder domain must be replaced with your own. Use a process manager/systemd and an HTTPS reverse proxy; retain the database across deploys, limit access to the app port, use a single instance and verify backup/restore. Do not put secrets directly in terminal history or commit an `.env` file.

## What is and is not delivered

The hosting configuration is provided, but no Render account was accessed, paid resources created, DNS changed or public deployment verified. A GitHub push is not a deployment. Production still needs managed database/RLS, verified email/password recovery, student-data rights/retention and guardian consent workflows, billing integrations and security/legal review. Read DELIVERY.md and docs/SECURITY.md before using real customer/student data. Migrating persistence to Supabase/PostgreSQL is necessary before choosing Vercel.
