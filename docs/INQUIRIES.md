# Capturing every inquiry with NEXA

## What works now

Open **Unified Inbox** in /app. Existing website-widget conversations appear alongside manually recorded calls, SMS, KakaoTalk, Instagram, email and other inquiries, plus public intake submissions. All records are persisted and restricted to your academy. Contacts are never automatically merged, even when they share an email/phone.

### Record calls and messages

Choose **Add inquiry**, select the original channel, enter the adult/guardian contact and a short message/summary, and confirm the lawful basis/consent. At least one email/phone is required. This records the inquiry and creates a consenting lead; it does not import your phone or messaging history.

### Use channel-specific public links

Choose **Intake links** and copy the link for KakaoTalk, SMS, calls, Instagram, email or referrals. Put it in a Kakao business-channel menu/greeting, staff SMS/email replies, social profile or QR code. Link sharing/sending is your action; NEXA does not send unsolicited messages.

The public /inquire/<agent> page accepts contact details, a question and explicit adult/guardian consent. A submitted inquiry is saved for human review; no AI request is made automatically. The confirmation lets the customer continue their scoped conversation and choose a real available booking slot. Channel source is the URL parameter, not verified provider attribution: a forwarded/copied link retains its source. Do not interpret it as a verified Kakao/SMS inbound message.

### Handle and follow up

Search/filter by channel or status. Assign an existing organization member, set New/Contacted/Waiting/Resolved, and save a follow-up date. Times are entered/displayed in the device's zone and stored in UTC. **Follow-ups due** filters unresolved items past their saved deadline; this is an actionable queue, not a background reminder service. Closing/resolving stops widget AI; reopening resumes human review.

Internal notes and external-reply records are staff-only and never appear in the customer thread. Due items survive restarts because metadata is in SQLite, subject to your hosting disk durability. Staff invitations are still unfinished; only existing members can be assigned.

### Draft/review replies

When NEXA_AI_API_KEY is configured, explicitly confirm you may share the inquiry with OpenAI, then request an AI summary/draft. The server removes known contact fields, recognizable email addresses and phone numbers, and sends a bounded thread plus approved FAQ question IDs. Free-text messages can contain other personal information; review and minimize them before sharing. Names/identifiers elsewhere are not guaranteed to be detected. This is not anonymization certification.

The AI may summarize the thread and select tenant-owned approved FAQs. The actual reply draft contains only the approved answers or a safe acknowledgement; no freely invented prices/schedules/actions are accepted. Output is saved privately, requires human review, and never sends itself. No key: controls show unavailable; manual workflows remain usable.

**Website/form conversations:** click Send to NEXA conversation after reviewing. The visitor sees this persisted reply through the widget. **Calls/SMS/Kakao/etc.:** copy the reviewed reply, send it in the original service yourself, then choose Record reply already sent externally. This is a staff attestation; it is not provider delivery confirmation. The old inbox API also rejects attempts to send an unconnected external reply.

## Direct integrations remain prerequisites

NEXA has not connected your existing phone number, SMS service, Kakao private chat history, email mailbox or Instagram account. To implement automatic synchronization, supply provider names, business account type and official supported API scope; never send credentials in chat. Inbound SMS-capable number access differs from an outbound-only sender ID. Kakao outbound 알림톡/친구톡 access does not establish inbound 상담톡 or unrestricted chat access.

The next provider adapter must validate webhook signatures, resolve organizations from server-managed provider bindings, persist provider event IDs idempotently, preserve original channel/message IDs, keep secrets server-only, and distinguish queued/sent/delivered/failed replies. Telephony recordings/transcription require proper notice/consent and retention. Never scrape personal Kakao messages or represent unsupported integrations as connected.

## Security and limitations

Intake validates source/type, bounded payloads, consent/contact fields, a honeypot and server-owned origin checks. A per-academy public intake cap is persisted (50/day); it is not a complete anti-bot service. Duplicate submission keys are rejected and never disclose an existing visitor token. Assignment, notes and AI citations are checked against the tenant. Public visitor sessions expose their own messages/slots only; staff notes and AI artifacts stay private.

Production still requires the documented Supabase/RLS migration, legal consent/retention/export/delete, distributed abuse defenses, verified provider adapters, durable outbound jobs and a security review. No live OpenAI/provider verification was performed without credentials. Tests distinguish real persisted app behavior from mocked OpenAI calls.
