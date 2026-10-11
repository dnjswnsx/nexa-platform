import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const file = process.env.NEXA_DB_PATH || '.data/nexa.sqlite';
mkdirSync(dirname(file), { recursive: true });
export const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
export const id = () => randomUUID();
export const now = () => new Date().toISOString();
export type Row = Record<string, string | number | null>;
export const one = (sql: string, ...args: (string | number | null)[]) => db.prepare(sql).get(...args) as Row | undefined;
export const all = (sql: string, ...args: (string | number | null)[]) => db.prepare(sql).all(...args) as Row[];
export const run = (sql: string, ...args: (string | number | null)[]) => db.prepare(sql).run(...args);
db.exec(`
CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password TEXT NOT NULL,name TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS organizations(id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',locale TEXT NOT NULL DEFAULT 'en',country TEXT NOT NULL DEFAULT 'KR',email TEXT NOT NULL DEFAULT '',agent_id TEXT NOT NULL UNIQUE,origins TEXT NOT NULL DEFAULT '[]',created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS members(org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,role TEXT NOT NULL CHECK(role IN ('owner','admin','staff')),PRIMARY KEY(org_id,user_id));
CREATE TABLE IF NOT EXISTS knowledge(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,question TEXT NOT NULL,answer TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,visitor_hash TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'ai' CHECK(state IN ('ai','human','closed')),created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,role TEXT NOT NULL CHECK(role IN ('visitor','ai','staff')),body TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,conversation_id TEXT REFERENCES conversations(id),name TEXT NOT NULL,email TEXT NOT NULL,interest TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'New',consent_at TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS slots(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,starts_at TEXT NOT NULL,ends_at TEXT NOT NULL,CHECK(ends_at>starts_at),UNIQUE(org_id,starts_at));
CREATE TABLE IF NOT EXISTS appointments(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,slot_id TEXT NOT NULL REFERENCES slots(id),lead_id TEXT NOT NULL REFERENCES leads(id),status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','cancelled')),request_key TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(org_id,request_key));
CREATE UNIQUE INDEX IF NOT EXISTS slot_booking_unique ON appointments(slot_id) WHERE status='confirmed';
CREATE INDEX IF NOT EXISTS conversations_org ON conversations(org_id,created_at);
CREATE INDEX IF NOT EXISTS knowledge_org ON knowledge(org_id);
CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation_id,created_at);
CREATE INDEX IF NOT EXISTS leads_org ON leads(org_id,created_at);
CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,body TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_logs(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);
INSERT OR IGNORE INTO schema_migrations VALUES(1,datetime('now'));
`);
// Migration 2: academy operations. Amounts are integer minor units (KRW won, USD cents).
db.exec(`
CREATE TABLE IF NOT EXISTS classes(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,name TEXT NOT NULL,monthly_fee INTEGER NOT NULL CHECK(monthly_fee>=0),monthly_cost INTEGER NOT NULL DEFAULT 0 CHECK(monthly_cost>=0),capacity INTEGER NOT NULL CHECK(capacity>0),created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS students(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,name TEXT NOT NULL,guardian_email TEXT NOT NULL DEFAULT '',consent_at TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS enrollments(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,student_id TEXT NOT NULL REFERENCES students(id),class_id TEXT NOT NULL REFERENCES classes(id),monthly_fee INTEGER NOT NULL CHECK(monthly_fee>=0),joined_at TEXT NOT NULL,ended_at TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS enrollment_active ON enrollments(student_id,class_id) WHERE ended_at IS NULL;
CREATE TABLE IF NOT EXISTS ledger(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,class_id TEXT REFERENCES classes(id),kind TEXT NOT NULL CHECK(kind IN ('income','expense')),amount INTEGER NOT NULL CHECK(amount>0),category TEXT NOT NULL,occurred_at TEXT NOT NULL,request_key TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(org_id,request_key));
CREATE INDEX IF NOT EXISTS enrollment_org ON enrollments(org_id,class_id);
CREATE INDEX IF NOT EXISTS ledger_org ON ledger(org_id,occurred_at);
INSERT OR IGNORE INTO schema_migrations VALUES(2,datetime('now'));
`);
db.exec(`
CREATE TABLE IF NOT EXISTS usage_events(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,purpose TEXT NOT NULL,model TEXT NOT NULL,input_tokens INTEGER NOT NULL,output_tokens INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS ai_advices(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,model TEXT NOT NULL,locale TEXT NOT NULL,snapshot TEXT NOT NULL,response TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS usage_org ON usage_events(org_id,created_at);
INSERT OR IGNORE INTO schema_migrations VALUES(3,datetime('now'));
`);
// Migration 4: shared inquiry metadata; companion tables preserve existing schemas.
db.exec(`
CREATE TABLE IF NOT EXISTS inquiry_details(
 conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
 channel TEXT NOT NULL CHECK(channel IN ('call','sms','kakao','instagram','email','other','form')),
 source TEXT NOT NULL,contact_name TEXT NOT NULL DEFAULT '',contact_email TEXT NOT NULL DEFAULT '',contact_phone TEXT NOT NULL DEFAULT '',
 consent_at TEXT NOT NULL,assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','waiting','resolved')),
 follow_up_at TEXT,created_by TEXT REFERENCES users(id) ON DELETE SET NULL,request_key TEXT NOT NULL,
 UNIQUE(request_key)
);
CREATE TABLE IF NOT EXISTS inquiry_notes(id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL CHECK(kind IN ('note','external_reply')),body TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS inquiry_ai(id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id),summary TEXT NOT NULL,draft TEXT NOT NULL,model TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS inquiry_followup ON inquiry_details(status,follow_up_at);
INSERT OR IGNORE INTO schema_migrations VALUES(4,datetime('now'));
`);
db.exec(`CREATE TABLE IF NOT EXISTS inquiry_controls(conversation_id TEXT PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,status TEXT NOT NULL CHECK(status IN ('new','contacted','waiting','resolved')),assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,follow_up_at TEXT);`);
// Migration 5: an academy's shared action plan and explicit, aggregate-only owner briefs.
db.exec(`
CREATE TABLE IF NOT EXISTS owner_tasks(
 id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 title TEXT NOT NULL,details TEXT NOT NULL DEFAULT '',section TEXT NOT NULL,
 priority TEXT NOT NULL CHECK(priority IN ('high','medium','low')),
 status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','done')),
 due_at TEXT,assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 source_key TEXT,request_key TEXT NOT NULL,created_by TEXT NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL,UNIQUE(org_id,request_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS task_source_unique ON owner_tasks(org_id,source_key) WHERE source_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_org ON owner_tasks(org_id,status,due_at);
CREATE TABLE IF NOT EXISTS owner_briefs(
 id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 model TEXT NOT NULL,locale TEXT NOT NULL,snapshot TEXT NOT NULL,response TEXT NOT NULL,created_at TEXT NOT NULL
);
INSERT OR IGNORE INTO schema_migrations VALUES(5,datetime('now'));
`);
