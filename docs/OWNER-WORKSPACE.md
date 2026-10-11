# Owner workspace and intelligent planning

Deploy the latest `main` commit, then sign in at `/app`. On the existing Render service, use **Manual Deploy → Deploy latest commit** if automatic deployment has not run. This is a development/staging app. A Render Free service with `/tmp` SQLite can lose records on redeployment; keep synthetic data only and recreate a test academy when needed.

## Use the workspace

1. **Today** is the owner/admin action center. It shows active students, the current enrollment tuition baseline, recorded cash, due follow-ups, next-24-hour appointments, class capacity and a launch checklist.
2. **What needs attention** is computed from stored records: overdue unresolved follow-ups, new unanswered staff inquiries, upcoming consultations, planned class losses, at least 90% capacity, net enrollment decline and missing approved FAQs. These are explicit rules, not AI predictions. Open a related workflow or select **Add to plan**. The same signal is stored only once per UTC day, including after completion.
3. **Team plan** is available to all members of that academy. Create, assign, search and complete tasks; filter **Assigned to me**. Owners can save rule-based suggestions or reviewed AI recommendations as tasks. Everyone in the workspace can update shared tasks. Staff invitations remain unimplemented; this does not create new team accounts.
4. **Growth planner** lets owners/admins compare retention, additional enrollments, a −20% to +20% tuition adjustment and additional monthly costs for an existing class. Save a scenario to the plan for review. This never changes fees, enrollment or cash records.
5. Use the top search button or **Ctrl+K / Cmd+K**. Search in English or Korean, use arrow keys and Enter, or click a result. Shortcuts open the student registry, enrollment form and cash-record form. Escape closes the dialog. The mobile menu closes when selecting a workflow or pressing Escape.
6. **Academy management** retains classes, students, enrollments, customizable cash categories and class growth guidance. **Unified Inbox** retains manual external-channel capture, intake links, follow-ups, private notes and reviewed replies.

## Scenario arithmetic

Amounts use integer KRW won or USD cents. Retained enrollments are rounded to whole people. Existing tuition scales by the retained proportion of the class's current customized enrollment fees; this assumes equal average tuition across retained students. New enrollments use the configured class fee. Both receive the scenario's tuition percentage adjustment. New enrollments are capped at available seats after modeled retention.

Modeled margin = modeled tuition − planned class monthly cost − entered additional cost. Approximate break-even uses the adjusted current average enrollment fee, or the listed class fee when there are no active enrollments. Zero-fee classes have no calculable break-even. Break-even can exceed class capacity; this means the scenario cannot cover costs within its present seat limit at that average fee.

This is a transparent what-if calculation, not a validated demand forecast or payment estimate. Taxes, seasonality, actual demand, tuition collection and future staffing changes are not inferred. Class enrollment counts may include students enrolled in multiple classes; the top active-student metric counts unique students.

## Cash and dates

The six-month chart uses manually entered ledger records for UTC calendar months. It displays income and expenses separately, with a table of exact amounts. No ledger entries mean unknown activity, not verified zero cash. Current tuition projections are never substituted for cash receipts. Appointment/task dates display in the academy's configured time zone. Task creation's local date/time input uses the operator's device time zone, stated in its label. Background polling is not a reminder-delivery service.

## OpenAI owner briefing

Set `NEXA_AI_API_KEY` securely in the host's server environment and restart/redeploy. The configured Responses-compatible model defaults to `gpt-4.1-mini`; API access and billing are separate from ChatGPT subscriptions. Click **Generate AI brief** to explicitly request a briefing; no automatic calls happen during dashboard loading.

Only numeric academy metrics, class IDs, setup booleans, task totals and six-month cash aggregates are sent. The request omits organization/class/student/contact names, guardian details, conversation text, task text and ledger category text. Requests use `store:false`, a timeout and the existing per-organization rolling request cap; token usage is recorded. Schema-valid briefings and their aggregate snapshots are stored for later review. Invalid AI actions are rejected rather than saved.

Review the summary, recommended actions and limitations. **Save as task** stores a reviewed recommendation; it does not send messages, change tuition or alter enrollment. AI advice can be incorrect. A detected key only establishes configuration, not successful live access. The provider checks in this delivery use mocks; no live key was available. Rule-based signals, tasks and the scenario planner work without an AI credential.

## Visuals

The design uses bundled Microsoft Fluent Emoji school, books and seedling SVGs under MIT, with the copyright/license retained. See [VISUALS.md](VISUALS.md). Browsers serve these visuals from NEXA's own `/visuals/` directory; page viewing does not call an image CDN. Both Korean and English, dark mode, keyboard search and small-screen layouts are supported.
