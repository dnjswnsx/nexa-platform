# Synthetic test academy

Explicitly run this command to create a fresh, isolated fake account and academy. It never runs during build/startup and does not populate existing customer organizations.

```sh
# Local instance:
npm run seed:demo
# Your hosted instance (replace with the actual website URL):
NEXA_DEMO_URL=https://your-actual-app.onrender.com npm run seed:demo
```

The command generates and prints a unique email and a random password; keep that output private. It creates a NEW account on each run and never resets an existing password. Optional NEXA_DEMO_EMAIL/NEXA_DEMO_PASSWORD can be injected securely to choose credentials, but do not commit passwords or put them into shared logs. Do not run this script in shared CI because it prints the new test account credentials.

The academy is named **NEXA Test Academy [DEMO]** and contains 12 synthetic students/enrollments, 3 classes, 6 labeled synthetic cash records, 4 approved English/Korean FAQs, 6 conversations/leads (3 website and 3 manually recorded call/SMS/Kakao examples), a confirmed future consultation, available slots and an example staff reply. It uses existing server APIs and verifies persisted counts plus logout/login. There are no historical growth claims, real payments, outgoing emails, real people or AI-provider calls. Origins are still enforced; deploy the Render origin fix first.

Open /app and sign in using the generated credentials. Explore Overview, Academy management, Knowledge Base, Leads, Appointments and AI Inbox. Render Free may lose the account and records after a restart/redeploy; rerun the command to create another demo if necessary. The account is not a protected production sandbox: keep it private and enter only synthetic data. Delete the demo environment/database when finished; the app does not yet provide complete organization deletion.
