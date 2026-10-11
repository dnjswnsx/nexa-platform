# NEXA implementation plan

## Audit
The selected GitHub repository is empty: the local `work` branch is unborn and `git ls-remote origin` returns no refs. Node 24 and npm 11 are available. No existing application or lockfile exists to preserve.

## Architecture
Build a modular Next.js/TypeScript monolith. A local SQLite adapter provides persistent, transaction-safe development without external credentials; production requires a managed PostgreSQL/Supabase adapter, RLS and verified provider configuration. Server-side membership authorization governs every tenant resource. Public agent identifiers and opaque visitor tokens scope widget access. Credentials stay on the server. UTC timestamps, IANA time zones, validated inputs, explicit consent and database transactions protect the core journey.

## Milestones and acceptance criteria
- [ ] Phase 1: executable app, authentication, organization membership, tenant authorization, database, design system. Verify registration/login and cross-tenant denial.
- [ ] Phase 2: organization onboarding, settings, dashboard. Verify persisted configuration and empty metrics.
- [ ] Phase 3: approved FAQs, grounded chat, messages, actual embed. Verify unknown-fact fallback and visitor isolation.
- [ ] Phase 4: consent-based leads, human inbox, appointments. Verify slot concurrency, human pause and dashboard persistence.
- [ ] Phase 5: durable notifications, real analytics. Verify events survive restart; external email remains disconnected without a configured adapter.
- [ ] Phase 6: provider integrations and subscriptions. No simulated payment success. Implement only integrations that can be meaningfully validated.
- [ ] Phase 7: unit/integration/E2E checks, deployment and security documentation.

## Dependencies and risks
Optional providers: Supabase, OpenAI, Stripe, Resend, Google and a Korean recurring-billing provider. No credentials will be invented. An empty repository and this product's scope mean several production requirements will need later implementation. Local SQLite is a development workflow, not a substitute for managed production tenant isolation. Legal templates require counsel. Never claim production readiness before email verification, password reset, production database isolation, provider webhooks, abuse controls and live integrations are verified.

## Validation
Required: TypeScript, unit/integration tests, production build and functional HTTP/browser checks of the implemented journey. Optional: live provider checks pending credentials. Record completed and unimplemented capabilities in README and DELIVERY.md.

## Scope update: Korean academy/school operations
User explicitly requests student records, enrollments, customizable finances and class growth/revenue guidance. Add minimal student registry with consent attestation, classes/capacity, per-enrollment tuition overrides, manual income/expense ledger with custom categories, transparent recurring-tuition projections and class growth metrics. Student PII must never enter public widgets or AI prompts. This local vertical slice does not implement student profiling, tax reporting or a verified AI financial forecast. Production handling of minors requires lawful basis, retention/export/deletion and specialist privacy review. The AI management copilot across services remains a separate unfinished milestone.


## Completion checkpoint
- [x] Local executable architecture, persistence, development authentication and server tenant checks; tests passed.
- [x] Local onboarding/dashboard and approved FAQ/real widget consultation journey; browser tests passed.
- [x] Consent-based leads, atomic bookings, human takeover/reply; browser and transaction tests passed.
- [x] Academy class/student/enrollment/custom-fee/ledger/growth vertical slice; tests passed.
- [x] Structured OpenAI consultation routing and aggregate-only growth advice adapters; mocked tests passed.
- [x] Dependency reinstall, build, lint, types, 25 unit/integration and 4 browser checks.
- [x] Reusable install/start instructions and secure AI requirements saved to environment draft.
- [ ] Real OpenAI requests: missing API credential (secure environment settings required).
- [ ] Full production phases 1–7: see DELIVERY.md; original milestones remain partial, not complete.


## Unified inquiries implementation
- [x] Companion migration preserving existing widget conversations and data.
- [x] Manual consent-aware call/text/Kakao/social/email capture and isolated leads.
- [x] Public consultation page with source-specific links and scoped widget/booking continuation.
- [x] Unified filters/search, member assignment, statuses, follow-up due queue and private notes.
- [x] Explicitly reviewed AI summaries/grounded drafts; direct NEXA replies and copied external replies with honest staff attestations.
- [x] Cross-tenant/privacy/idempotency/consent tests plus complete browser workflow.
- [ ] Direct channel provider adapters: names, supported inbound APIs, business approvals and secure credentials are prerequisites. No simulated connection.
