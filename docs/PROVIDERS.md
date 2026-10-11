# Provider configuration and manual QA

## OpenAI (implemented; live verification pending)
1. Fund an API project, verify model access and issue a scoped server key.
2. Set `NEXA_AI_API_KEY` securely for HTTPS `api.openai.com`; choose `NEXA_AI_MODEL` if needed. Save settings and restart.
3. Add approved FAQs in both languages. Ask an exact question (deterministic path), then a paraphrase (actual API path); inspect actual token records. Confirm unknown facts and injection attempts hand off rather than invent prices.
4. Add non-sensitive synthetic classes/enrollments. Request guidance, confirm class references and persisted output. Verify request failure shows an error, not success; verify absent keys leave the control unavailable.
5. Set organization request limits and provider project spend limits. Review aggregate disclosures and OpenAI data-processing terms before real use. Do not send student PII.

## Supabase (NOT implemented)
A URL/key alone does not enable production data storage. Implement and test PostgreSQL migrations, composite tenant foreign keys, RLS for every tenant table, authenticated ownership/membership policies, production Auth (verification, reset, OAuth) and Storage MIME/size policies. Keep service-role credentials server-only. Test tenant isolation directly against SQL and Storage as two users. Require migration backups and tested restoration before deployment.

## Stripe / Korean payments (NOT implemented)
There is no checkout, subscription adapter, webhook or paid entitlement. For US businesses, implement test-mode Stripe Checkout/Portal behind a billing interface, verify signed webhooks, persist events and idempotency and never trust redirects. Korean businesses require a verified merchant agreement and documented recurring-billing eligibility from a suitable provider such as Toss; do not route them to an unsupported Stripe flow. No card data may be stored. Record plan currency separately. Proposed marketing prices do not activate paid plans.

## Resend email (NOT implemented)
Verify an owned sending domain and secure provider binding before writing an email adapter. Add a durable outbox with retries, deduplication, consent-aware follow-up and unsubscribe behavior. Development in-app notifications are already persisted, but they are not emails and not scheduled automations. Verify delivery and failures with safe test recipients.

## Google OAuth / Calendar (NOT implemented)
Register OAuth consent, exact callback URLs and least-privilege scopes. Implement expiring state, encrypted refresh-token persistence, revocation and disconnect. Calendar provider availability must not override atomic internal booking uniqueness. Test daylight saving, revoked consent and sync errors. No connection should be represented as operational before verified.

## Manual acceptance checks for launch
Test verified signup/recovery, owner/admin/staff permissions and invitations; migration and RLS; student consent/lawful basis, export/delete/retention; booking concurrent requests and rescheduling; provider webhook duplicates, wrong signatures and delayed events; real email delivery; AI cost caps and injection; actual external widget on desktop/mobile; keyboard navigation, screen readers and WCAG contrast; backups/restoration, audit/redaction and observability. None of these pending provider/production checks is certified by passing local mocks.
