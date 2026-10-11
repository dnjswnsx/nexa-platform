# NEXA

A working **local development** application for bilingual academy front-desk and academy operations. This repository started empty. It is **not production ready**, and the full requested SaaS specification remains partially implemented. See [DELIVERY.md](DELIVERY.md) for precise status.

## Start locally

Node 24, npm 11, persistent local disk. No credentials are necessary for the core development workflow.

```sh
cd /workspace/nexa-platform
npm_config_devdir=/workspace/.node-gyp npm ci --cache /workspace/.npm-cache
npm run build
APP_URL=http://localhost:3000 npm start
# Alternatively, use npm run dev for development after installation.
```

Use `/app` to create an account (password: at least 12 characters), create a workspace, enter approved FAQs, publish future consultation times, and open the assistant from AI Agent. No users, activity, payments or financial records are seeded. `.data/nexa.sqlite` persists real locally entered records. Never populate this development database with real children's information.

The current cloud task already has an isolated environment. Use its existing checkout; do not create a worktree unless explicitly requested.

## Core workflow

For manual call/SMS/Kakao capture, public intake links, staff assignment/follow-up and reviewed AI replies, see [docs/INQUIRIES.md](docs/INQUIRIES.md). Use **Unified Inbox** in the dashboard; direct telecom/Kakao synchronization remains unconnected.

1. Register and create your academy. Development email verification is not implemented.
2. Add approved questions and answers. Without OpenAI, the assistant answers exact matching FAQs and hands other questions to staff.
3. Set allowed external origins in Settings; copy the actual embed code from AI Agent.
4. Visitors chat, explicitly consent to sharing adult/guardian contact details, and confirm available booking slots.
5. View persisted leads, appointments and messages. Take over in AI Inbox; AI is paused while staff reply.
6. Academy management: create classes (capacity, tuition, planned costs), consent-attested student records, enrollments with custom tuition, and income/expense records with user-defined categories.
7. Inspect class utilization, 30-day enrollment growth, current-enrollment tuition projections and rule-based guidance. When OpenAI is configured, request actual AI advice using only aggregate metrics.

## OpenAI / ChatGPT API

A ChatGPT subscription does not supply API billing. Create an OpenAI API project with model access and funded API billing. Enter the API credential **securely in environment settings**, never in chat, source control or browser variables.

| Variable | Purpose | Required |
| --- | --- | --- |
| `APP_URL` | Exact app/custom-domain origin; Render also automatically trusts its server-provided `RENDER_EXTERNAL_URL` | Required outside Render or for custom domains |
| `NEXA_DB_PATH` | SQLite location, default `.data/nexa.sqlite` | Optional |
| `NEXA_AI_API_KEY` | Server OpenAI credential, HTTPS destination `api.openai.com` | For AI |
| `NEXA_AI_MODEL` | Default `gpt-4.1-mini`; configure a Responses/structured-output compatible model available to your project | Optional |
| `NEXA_AI_DAILY_CAP` | Per-organization rolling 24-hour AI request cap; default 100 | Optional |

Legacy `OPENAI_API_KEY` / `OPENAI_MODEL` are also recognized locally. Cloud secret target names prefixed `OPENAI_` are reserved, so use `NEXA_AI_API_KEY` for this environment. Restart the server after changing environment bindings. No actual API key was present at setup; live AI verification is pending. Merely detecting a key does not establish successful access.

`src/ai.ts` calls the OpenAI Responses API with strict JSON schemas, `store:false`, timeout, server-only authentication and a persistent request cap. Consultation matches paraphrased inquiries to a tenant's approved FAQ ID, then returns the approved answer verbatim. This deliberately prevents freely generated business facts. Approve separate English/Korean FAQs as needed; automatic faithful translation is not implemented. Unknown questions escalate to a person.

Academy guidance uses computed class aggregates, omits names of classes/students and guardian contact details, rejects unknown class IDs, records actual API token usage and persists the advice plus its input snapshot. Advice is reviewable narrative, never an autonomous change. Mechanical revenue projections are calculated by the server, not invented by the model. OpenAI can still produce incorrect advice; production evaluation, output policy enforcement and human review are necessary. Token cost in currency is not estimated because model pricing is not hardcoded.

## Financial definitions

- Currency: KR organizations use KRW won; US organizations use USD cents internally. Currencies are never mixed.
- Monthly projected tuition: sum of current active enrollment monthly fees. It is not collected cash, guaranteed revenue, a seasonal forecast or an accounting statement.
- Planned class margin: projected tuition minus the configured class monthly cost.
- Actual income/expenses/net cash: manually recorded ledger entries in the current UTC calendar month. No payment is processed.
- New enrollment growth: joins in the last 30 days compared with the preceding 30 days. A missing baseline is unknown, not 0% growth.
- Net enrollment growth: joins minus withdrawals in the last 30 days. Capacity and duplicate registration are checked within immediate SQLite transactions.
- Individual enrollment tuition overrides and custom ledger categories provide financial customization. Editing/deleting financial entries, invoicing, refunds, bank reconciliation and a custom reporting builder remain unimplemented.

## Database / migrations / recovery

`src/db.ts` applies additive versioned migrations 1–4 on server initialization. To apply them locally, start the app and request `/api/health`. Migration versions are in `schema_migrations`. There is no PostgreSQL/Supabase migration or production RLS yet.

Before upgrades, use SQLite's online backup API or stop the server and copy the entire database plus any WAL/SHM state. Do not copy only the main file while a writer is active. Restore an offline backup to roll back; there is no destructive down migration. Test recovery on a copy, not your only database.

## Validate

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

E2E launches the production build on port 3100 with a separate `.data/e2e.sqlite`. Do not run `next build` concurrently with dev/E2E servers sharing `.next`. The cloud image has `/usr/bin/chromium`; override `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if needed. On a new machine, install Playwright Chromium and set that variable to its executable path. The default Playwright download domain was forbidden in onboarding; the installed system browser worked without bypassing verification.

Unit/integration tests mock OpenAI and are **not live provider tests**. Browser tests create explicitly named synthetic test accounts and persist them only in the isolated E2E database. A new task's restoration and CI runs have not been independently verified.

## Structure

- `src/app`: marketing, account/dashboard UI, public iframe assistant and JSON routes.
- `src/security.ts`: hashed opaque sessions, membership checks, origin validation, persistent limits and audit events.
- `src/db.ts`: local relational schema and additive migration versions.
- `src/domain.ts`: atomic consultation bookings, tenant-scoped approved knowledge routing.
- `src/academy.ts`: student/class/enrollment ledger operations and aggregate analysis.
- `src/ai.ts`: server-side structured OpenAI adapter and token records.
- `src/components/Academy.tsx`: academy operations interface.
- `public/widget.js`: actual isolated embeddable widget; `embed-example.html`: test host.
- `tests`: meaningful domain, authorization, mocked provider and browser workflow tests.
- `docs`: provider configuration, embedding and launch guidance.

## Deployment

For exact web hosting steps, see [docs/HOSTING.md](docs/HOSTING.md). The included `render.yaml` configures a paid single-instance Render development service with persistent SQLite storage. Hosting has not been executed or verified.

For an internal development server, retain persistent disk, use TLS, set `APP_URL`, securely inject the AI key and run `npm run build && npm start`. Live provider access needs `api.openai.com` network permission.

**Do not deploy this SQLite adapter to Vercel or expose this development build as a production SaaS.** Vercel-compatible Next.js routes are present, but an actual Vercel deployment requires a managed PostgreSQL/Supabase data adapter, migrations, RLS, Supabase Auth, Storage and all other launch blockers listed in DELIVERY. These are implementation tasks, not something solved by entering credentials. No deployment or publication has occurred.
