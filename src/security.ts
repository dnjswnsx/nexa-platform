import { isAppOrigin } from './origin';
import { createHash, randomBytes } from 'node:crypto';
import { all, db, id, now, one, run, type Row } from './db';
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export const hash = (v: string) => createHash('sha256').update(v).digest('hex');
export const token = () => randomBytes(32).toString('hex');
export function currentUser(req: Request): Row | undefined {
 const cookie = req.headers.get('cookie')?.match(/(?:^|;\s*)nexa_session=([a-f0-9]{64})(?:;|$)/)?.[1];
 return cookie ? one('SELECT u.id,u.name,u.email FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires_at>?',hash(cookie),now()) : undefined;
}
export function authorize(req: Request, orgId: string, admin = false) {
 const user = currentUser(req); if (!user) throw new HttpError(401,'Please sign in.');
 const member = one('SELECT role FROM members WHERE org_id=? AND user_id=?',orgId,String(user.id));
 if (!member || (admin && member.role === 'staff')) throw new HttpError(403,'Access denied.');
 return user;
}
export function checkOrigin(req: Request) {
 const origin = req.headers.get('origin');
 if (!isAppOrigin(origin, req.url)) throw new HttpError(403,'Invalid request origin.');
}
export function limit(key: string, max = 30, seconds = 60) {
 db.transaction(() => {
 const time = Date.now();
 run('DELETE FROM rate_limits WHERE expires_at<?',time);
 const record = one('SELECT * FROM rate_limits WHERE key=?',key);
 if (record && Number(record.count)>=max) throw new HttpError(429,'Too many requests. Please try again later.');
 if (record) run('UPDATE rate_limits SET count=count+1 WHERE key=?',key);
 else run('INSERT INTO rate_limits VALUES(?,1,?)',key,time+seconds*1000);
 })();
}
export function audit(org: string,user: string,action: string) { run('INSERT INTO audit_logs VALUES(?,?,?,?,?)',id(),org,user,action,now()); }
export function organizationList(userId: string) { return all('SELECT o.*,m.role FROM organizations o JOIN members m ON m.org_id=o.id WHERE m.user_id=?',userId); }
