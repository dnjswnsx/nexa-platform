# Delivery status — 2026-10-11

## Result
A runnable local NEXA development application was implemented from an empty repository, including an actual persisted front-desk journey and academy-management vertical slice. Full production SaaS scope is **incomplete**. OpenAI integration code exists and has mocked-provider tests, but no live credential was available. No public web deployment, environment publication or fresh-task restoration was performed.

## Verified checks

| Command | Current result |
| --- | --- |
| `npm_config_devdir=/workspace/.node-gyp npm ci --cache /workspace/.npm-cache` | Passed; fresh frozen installation, native SQLite compile/header verification preserved |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 31 passed across 3 suites |
| `npm run build` | Passed with Next.js 16.4 |
| `npm run test:e2e` | 4 passed using installed system Chromium |
| Production server `/api/health` | Passed; SQLite connected |

Browser suites verify signup, organization creation, FAQs, consent-based lead capture, consultation booking, human takeover/reply, dashboard persistence after refresh, Korean navigation/mobile menu, student/class/enrollment/cash-record persistence, configured-fee projections, HTTP tenant isolation, CSRF rejection, visitor isolation, absent-consent rejection and actual external-origin widget delivery. Unit/integration suites additionally cover booking idempotency/uniqueness/cancellation, capacity enforcement, customized fees, withdrawals, provider failures, aggregate-only AI payloads and persisted token/advice records. Provider checks use mocks and do not prove real API service behavior. CI workflow is written; a remote CI run has not occurred.

Initial test failures were diagnosed and corrected: missing icon/module format, effects initialization, stale tab data and nested text assertions. A simultaneous Next build/dev run caused hot reload interference; E2E now runs a completed production build sequentially. Native reinstall needed a writable node-gyp cache. Playwright download failed with network policy 403; the supplied system browser was used. None of these current checks remains failing.

## Feature checklist

| Capability | Implemented / tested / configured / blocked |
| --- | --- |
| Bilingual marketing, pricing, account UI, dark mode, responsive dashboard | Implemented; locale/mobile navigation tested. Proposed prices only; some standalone marketing pages remain absent. No accessibility certification. |
| Password login/signup/logout, hashed sessions | Implemented and tested for local development. Email verification, recovery and OAuth not implemented. |
| Organizations, membership checks, settings/switching | Implemented; tenant authorization tested. Invites/platform admin/complete RBAC UI not implemented. |
| Approved FAQ knowledge | Implemented/tested. PDF/DOCX/TXT upload, website import, vector retrieval and edit UI not implemented. |
| Conversations, actual widget, scoped visitor sessions | Implemented/tested, including external host. Advanced CSP/parent verification and third-party browser handling pending. |
| Grounded bilingual FAQ response / human fallback | Implemented/tested. OpenAI selects approved FAQ IDs for paraphrases; approved text is returned verbatim. Automatic response translation and broad free-form AI assistant pending. |
| Consent-based leads, status filtering/search and CSV | Implemented; lead capture tested. Assignment, tags, notes, duplicate handling and complete CRM timeline pending. |
| Atomic bookings, availability publication, cancellation, idempotency | Implemented; uniqueness/cancellation tests passed. Staff schedules, buffers, blackout rules, public rescheduling and reminders pending. |
| Human inbox, near-real-time polling, takeover/reply/close/reopen | Implemented; takeover/reply tested. Internal notes, assignment, summaries and unread counts pending. |
| In-app event notifications | Persisted and exercised by bookings/leads. Durable scheduling/retry jobs, email and automations not implemented. |
| Dashboard actual counts / lead capture ratio | Implemented and exercised; no fake activity. Date charts, response metrics, full attribution/funnel and customizable reports pending. |
| Classes, student registry, consent attestation, capacity, enrollment/withdrawal | Implemented; persistence, capacity, consent and withdrawal tests passed. Attendance, student portal, bulk import, field builder and legal consent/retention lifecycle pending. |
| Custom enrollment tuition, class cost, ledger categories, manual cash records | Implemented; exact monetary calculations and ledger idempotency tested. Transaction edit/reversal, invoices and reconciliation pending. |
| Class recurring-tuition projections, utilization and enrollment growth | Implemented and tested; assumptions shown. No guaranteed collections or statistically validated forecast. |
| OpenAI growth/revenue-interpretation guidance | Implemented; mocked provider, no-PII aggregate input, output IDs, usage/advice persistence and failure tests passed. Actual OpenAI verification blocked by missing API key. |
| OpenAI server adapter / timeout / structured output / request cap | Implemented/tested with mocks. Real model access/API billing/network propagation need verification. |
| Stripe, Korean billing, Resend, Google Calendar | Not implemented. UI accurately reports unavailable. Keys alone will not enable these services. |
| Production Supabase PostgreSQL/Auth/Storage/RLS | Not implemented. Local SQLite is not suitable for Vercel or public production deployment. |
| Privacy/terms templates and launch checklist | Written, expressly incomplete and subject to legal review. Not compliance certification. |

## Saved cloud configuration

Saved and confirmed: `install_script`, `start_skill`, `NEXA_AI_MODEL` / `NEXA_AI_DAILY_CAP` variable requirements, secure `NEXA_AI_API_KEY` requirement and custom network access for `api.openai.com`. Existing package-manager preset destinations were preserved. Scripts were executed in the current instance; saving them did not execute or publish them. No credentials were copied into code or instructions.

Required user action: enter the API credential securely in environment settings, review/save the draft, then publish the development environment. Restart after bindings apply and verify actual paraphrased FAQ and academy-guidance requests before claiming OpenAI is operational. A ChatGPT subscription is separate from OpenAI API billing. Publication itself does not deploy a public SaaS.

## Next implementation work

1. Replace local persistence/auth with production Supabase/PostgreSQL migrations and tested RLS; implement verified signup/reset, role invitations and staff permissions.
2. Add lawful student-data lifecycle, retention/export/delete, guardian verification and privacy review before real school data.
3. Complete knowledge ingestion, richer grounded consultation/i18n and staff tools without sending student PII to providers.
4. Extend booking rules/rescheduling and implement a durable notification/outbox worker.
5. Add actual provider billing/calendar/email adapters, idempotent signed webhooks and entitlements.
6. Add financial correction/audit and reporting tools, validate forecasting assumptions against adequate historical data; review all AI advice.
7. Complete security/accessibility/performance/live-provider QA and deployment. See docs/SECURITY.md and docs/PROVIDERS.md.

Exact startup, variables, migration and deployment instructions: README.md. Architecture and milestones: PLAN.md. The remote was empty during the initial audit. Subsequent GitHub delivery is recorded in Git history; web hosting instructions are in docs/HOSTING.md.

## Render signup correction
The app now trusts the server-controlled RENDER_EXTERNAL_URL alongside an explicit APP_URL, instead of comparing the public HTTPS browser origin only to the internal HTTP request URL. Secure session cookies and own-site widget checks share the same origin configuration. Verified with a local Render proxy simulation: signup 200, authenticated secure session, organization creation 201, widget session 200 and unrelated-origin rejection 403. All 31 unit/integration and 4 browser tests passed. The user’s actual hosted deployment has not yet been verified.
