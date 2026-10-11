# Production launch blockers

This is a development implementation. Do not use real student/minor data yet.

- Replace local SQLite authorization with managed PostgreSQL composite tenant constraints and tested RLS. Current foreign-key references do not independently enforce tenant identity; the server validates joins/references.
- Implement verified email, reset, Google OAuth, invitations, session rotation/revocation management, platform admin and least-privilege production access.
- Student consent checkbox is an attestation, not a complete legal consent workflow. Define guardian verification, purpose/retention, rights requests, access scopes, deletion/export and cross-border transfer disclosures. Have PIPA and US education/children's-data implications reviewed by counsel. Avoid profiling children.
- Public FAQ prompts are untrusted. AI consultation can select only approved IDs and replies use approved stored text. Evaluate false matches, cross-language coverage, injection and cost exhaustion with live models. Advice is untrusted text, rendered safely by React, and must be reviewed by humans. No tools change fees or send messages automatically.
- Request caps are database-backed global/visitor/organization controls, not a complete distributed abuse service. Add reliable trusted-client limits, bot protection, monitoring and provider spend budgets. Protect direct connections behind TLS and a trusted proxy; CSRF uses exact origin for mutations plus SameSite cookies.
- Add security CSP including per-agent frame ancestors; test iframe parent identity and blocked third-party storage. Secure outputs/exports are escaped, including spreadsheet formulas.
- Add encrypted backups, recovery drills, structured operational metrics/error reporting without PII and audit review/export. Financial edit/reversal workflows need an immutable audit trail.
- Implement safe document upload parsing, MIME limits and SSRF-safe public-page import before exposing those features. They are currently absent.
- Implement real provider adapters, signed/idempotent billing webhooks, durable jobs and consent-aware notifications before enabling payments or automations.
- Perform security review, WCAG 2.2 AA audit, daylight-saving tests, destructive-data recovery and load/concurrency testing before declaring production readiness.
