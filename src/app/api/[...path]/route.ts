import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z, ZodError } from 'zod';
import { all, db, id, now, one, run } from '@/db';
import { authorize, audit, checkOrigin, currentUser, hash, HttpError, limit, organizationList, token } from '@/security';
import { academyAdvice, academyData, academyMutation } from '@/academy';
import {aiConfigured} from '@/ai';
import { answer, availableSlots, book } from '@/domain';
export const runtime = 'nodejs';
const str = z.string().trim().min(1).max(500);
const email = z.string().trim().toLowerCase().email().max(254);
const uuid = z.string().uuid();
const json = (v: unknown, status=200) => NextResponse.json(v,{status,headers:{'Cache-Control':'no-store'}});
async function body(req: Request) { if(Number(req.headers.get('content-length')||0)>65536) throw new HttpError(413,'Request too large.'); const raw = await req.text(); if(raw.length>65536) throw new HttpError(413,'Request too large.'); try{return JSON.parse(raw);}catch{throw new HttpError(400,'Invalid JSON.');} }
async function handle(req: Request) {
 try {
 const url = new URL(req.url); const p = url.pathname.slice(5).split('/').filter(Boolean); const method = req.method;
 if(p[0]==='health') return json({status:'ok',database:one('SELECT 1 AS connected')?.connected,mode:'local-development'});
 if(p[0]==='auth') {
 if(method==='GET') {const u=currentUser(req);return json({user:u||null,organizations:u?organizationList(String(u.id)):[]});}
 checkOrigin(req); limit('auth-global',100);
 if(p[1]==='logout') {const t=req.headers.get('cookie')?.match(/nexa_session=([a-f0-9]{64})/)?.[1];if(t)run('DELETE FROM sessions WHERE token=?',hash(t));const res=json({ok:true});res.cookies.set('nexa_session','',{httpOnly:true,sameSite:'lax',path:'/',maxAge:0});return res;}
 const b=z.object({email,password:z.string().min(12).max(128),name:str.optional()}).parse(await body(req));
 let u=one('SELECT * FROM users WHERE email=?',b.email);
 if(p[1]==='register') {
 if(!b.name)throw new HttpError(400,'Name is required.');
 if(u)throw new HttpError(409,'Unable to register this email.');
 const uid=id();const password=await bcrypt.hash(hash(b.password),12);run('INSERT INTO users VALUES(?,?,?,?,?)',uid,b.email,password,b.name,now());u=one('SELECT * FROM users WHERE id=?',uid);
 } else if(p[1]!=='login')throw new HttpError(404,'Not found.');
 else if(!u || !await bcrypt.compare(hash(b.password),String(u.password)))throw new HttpError(401,'Invalid email or password.');
 const t=token();run('DELETE FROM sessions WHERE expires_at<?',now());run('INSERT INTO sessions VALUES(?,?,?)',hash(t),String(u!.id),new Date(Date.now()+7*86400000).toISOString());
 const res=json({ok:true});res.cookies.set('nexa_session',t,{httpOnly:true,sameSite:'lax',secure:url.protocol==='https:',path:'/',maxAge:604800});return res;
 }
 if(p[0]==='public') {
 const agent=one('SELECT * FROM organizations WHERE agent_id=?',p[1]||'');if(!agent)throw new HttpError(404,'Assistant not found.');
 const org=String(agent.id);const action=p[2];
 // Requests originate inside our iframe, not the host document. Validate host at session creation.
 if(method==='POST')checkOrigin(req);
 const visitor=req.headers.get('x-visitor-token')||'';
 if(action==='session' && method==='POST') {
 limit(`session:${org}`,100);
 const b=z.object({hostOrigin:z.string().url()}).parse(await body(req));const host=new URL(b.hostOrigin).origin;
 const allowed: string[]=JSON.parse(String(agent.origins));const own=new URL(process.env.APP_URL||req.url).origin;
 if(host!==own && !allowed.includes(host))throw new HttpError(403,'This website is not approved for the widget.');
 const v=token();const c=id();run('INSERT INTO conversations VALUES(?,?,?,?,?)',c,org,hash(v),'ai',now());return json({conversationId:c,visitorToken:v,business:agent.name});
 }
 if(!/^[a-f0-9]{64}$/.test(visitor))throw new HttpError(401,'Visitor session required.');
 const c=one('SELECT * FROM conversations WHERE org_id=? AND visitor_hash=?',org,hash(visitor));if(!c)throw new HttpError(401,'Invalid visitor session.');
 if(method==='GET')return json({business:agent.name,state:c.state,messages:all('SELECT role,body,created_at FROM messages WHERE conversation_id=? ORDER BY rowid',String(c.id)),slots:availableSlots(org)});
 limit(`visitor:${hash(visitor)}`,20);
 const b=await body(req);
 if(action==='message') {
 const v=z.object({message:z.string().trim().min(1).max(2000),locale:z.enum(['en','ko'])}).parse(b);
 if(c.state==='closed')throw new HttpError(409,'This conversation is closed.');
 run('INSERT INTO messages VALUES(?,?,?,?,?)',id(),String(c.id),'visitor',v.message,now());
 if(c.state==='human')return json({ok:true,human:true});
 limit(`org-messages:${org}`,200,86400);
 const a=await answer(org,v.message,v.locale);
 // Recheck takeover after awaiting the provider; never insert AI replies after a staff takeover.
 if(one('SELECT state FROM conversations WHERE id=?',String(c.id))?.state==='ai') {
 run('INSERT INTO messages VALUES(?,?,?,?,?)',id(),String(c.id),'ai',a.text,now());
 if(a.handoff) {run("UPDATE conversations SET state='human' WHERE id=?",String(c.id));run('INSERT INTO notifications VALUES(?,?,?,?)',id(),org,'A visitor requested information requiring human review.',now());}
 }
 return json({ok:true,provider:a.provider});
 }
 if(action==='handoff') {run("UPDATE conversations SET state='human' WHERE id=?",String(c.id));return json({ok:true});}
 if(action==='lead') {
 const v=z.object({name:str,email,interest:z.string().max(500).default(''),consent:z.literal(true),adult:z.literal(true)}).parse(b);
 const lead=id();run('INSERT INTO leads VALUES(?,?,?,?,?,?,?,?,?)',lead,org,String(c.id),v.name,v.email,v.interest,'New',now(),now());run('INSERT INTO notifications VALUES(?,?,?,?)',id(),org,'A new consenting adult/guardian lead was captured.',now());return json({leadId:lead},201);
 }
 if(action==='book') {
 const v=z.object({slotId:uuid,leadId:uuid,requestKey:uuid,confirmed:z.literal(true)}).parse(b);
 if(!one('SELECT id FROM leads WHERE id=? AND org_id=? AND conversation_id=?',v.leadId,org,String(c.id)))throw new HttpError(403,'Lead does not belong to this visitor.');
 return json({appointment:book(org,v.slotId,v.leadId,v.requestKey)});
 }
 throw new HttpError(404,'Not found.');
 }
 const u=currentUser(req);if(!u)throw new HttpError(401,'Please sign in.');
 if(method!=='GET')checkOrigin(req);
 if(p[0]==='orgs' && method==='POST' && p.length===1) {
 const b=z.object({name:str,description:z.string().max(3000).default(''),timezone:str,locale:z.enum(['en','ko']),country:z.enum(['KR','US']),email}).parse(await body(req));
 try{new Intl.DateTimeFormat('en',{timeZone:b.timezone});}catch{throw new HttpError(400,'Invalid IANA time zone.');}
 const org=id();db.transaction(()=>{run('INSERT INTO organizations VALUES(?,?,?,?,?,?,?,?,?,?)',org,b.name,b.description,b.timezone,b.locale,b.country,b.email,id(),'[]',now());run('INSERT INTO members VALUES(?,?,?)',org,String(u.id),'owner');audit(org,String(u.id),'organization.created');})();return json({id:org},201);
 }
 if(p[0]!=='orgs' || !p[1])throw new HttpError(404,'Not found.');
 const org=p[1];const action=p[2];
 if(action==='advice'){authorize(req,org,true);if(method!=='POST')throw new HttpError(405,'POST required.');const v=z.object({locale:z.enum(['en','ko'])}).parse(await body(req));return json(await academyAdvice(org,v.locale));}
 if(action==='academy'){authorize(req,org,true);if(method==='GET')return json(academyData(org));return json(academyMutation(org,String(u.id),await body(req)));}
 authorize(req,org,method!=='GET' && ['settings','knowledge','slots','team'].includes(action));
 if(method==='GET') {
 if(action==='export') {const rows=all('SELECT name,email,interest,status,consent_at,created_at FROM leads WHERE org_id=?',org);const safe=(v:unknown)=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};const csv=['name,email,interest,status,consent_at,created_at',...rows.map(r=>Object.values(r).map(safe).join(','))].join('\r\n');return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="leads.csv"','Cache-Control':'no-store'}});}
 const conversations=all('SELECT * FROM conversations WHERE org_id=? ORDER BY created_at DESC',org);
 return json({organization:one('SELECT * FROM organizations WHERE id=?',org),knowledge:all('SELECT * FROM knowledge WHERE org_id=? ORDER BY created_at DESC',org),leads:all('SELECT * FROM leads WHERE org_id=? ORDER BY created_at DESC',org),slots:availableSlots(org),appointments:all('SELECT a.*,s.starts_at,s.ends_at,l.name,l.email FROM appointments a JOIN slots s ON s.id=a.slot_id JOIN leads l ON l.id=a.lead_id WHERE a.org_id=? ORDER BY s.starts_at',org),conversations:conversations.map(c=>({...c,messages:all('SELECT role,body,created_at FROM messages WHERE conversation_id=? ORDER BY rowid',String(c.id))})),notifications:all('SELECT * FROM notifications WHERE org_id=? ORDER BY created_at DESC LIMIT 50',org),team:all('SELECT u.name,u.email,m.role FROM members m JOIN users u ON u.id=m.user_id WHERE m.org_id=?',org),integrations:{ai:aiConfigured()?'configured-unverified':'approved-faq-only',billing:'unavailable',email:'unavailable',calendar:'unavailable'}});
 }
 const b=await body(req);
 if(action==='knowledge') {
 if(method==='DELETE') {const v=z.object({id:uuid}).parse(b);run('DELETE FROM knowledge WHERE id=? AND org_id=?',v.id,org);}
 else {const v=z.object({question:str,answer:z.string().trim().min(1).max(5000)}).parse(b);if(Number(one('SELECT count(*) AS n FROM knowledge WHERE org_id=?',org)?.n)>=100)throw new HttpError(409,'FAQ limit reached.');run('INSERT INTO knowledge VALUES(?,?,?,?,?)',id(),org,v.question,v.answer,now());}
 audit(org,String(u.id),'knowledge.updated');return json({ok:true});
 }
 if(action==='settings') {
 const v=z.object({name:str,description:z.string().max(3000),origins:z.array(z.string().url()).max(20)}).parse(b);const origins=v.origins.map(s=>new URL(s).origin);run('UPDATE organizations SET name=?,description=?,origins=? WHERE id=?',v.name,v.description,JSON.stringify(origins),org);audit(org,String(u.id),'settings.updated');return json({ok:true});
 }
 if(action==='slots') {
 const v=z.object({startsAt:z.iso.datetime(),endsAt:z.iso.datetime()}).parse(b);if(v.startsAt<=now() || v.endsAt<=v.startsAt)throw new HttpError(400,'Choose a future interval with a positive duration.');
 db.transaction(()=>{if(one('SELECT id FROM slots WHERE org_id=? AND starts_at<? AND ends_at>?',org,v.endsAt,v.startsAt))throw new HttpError(409,'Availability overlaps an existing slot.');run('INSERT INTO slots VALUES(?,?,?,?)',id(),org,v.startsAt,v.endsAt);}).immediate();return json({ok:true});
 }
 if(action==='leads') {const v=z.object({id:uuid,status:z.enum(['New','Contacted','Qualified','Consultation Booked','Converted','Lost'])}).parse(b);run('UPDATE leads SET status=? WHERE id=? AND org_id=?',v.status,v.id,org);return json({ok:true});}
 if(action==='appointments') {const v=z.object({id:uuid}).parse(b);run("UPDATE appointments SET status='cancelled' WHERE id=? AND org_id=?",v.id,org);audit(org,String(u.id),'appointment.cancelled');return json({ok:true});}
 if(action==='inbox') {
 const v=z.object({id:uuid,state:z.enum(['ai','human','closed']).optional(),reply:z.string().trim().min(1).max(3000).optional()}).parse(b);
 if(!one('SELECT id FROM conversations WHERE id=? AND org_id=?',v.id,org))throw new HttpError(404,'Conversation not found.');
 db.transaction(()=>{if(v.state)run('UPDATE conversations SET state=? WHERE id=? AND org_id=?',v.state,v.id,org);if(v.reply){run("UPDATE conversations SET state='human' WHERE id=?",v.id);run('INSERT INTO messages VALUES(?,?,?,?,?)',id(),v.id,'staff',v.reply,now());}})();return json({ok:true});
 }
 throw new HttpError(404,'Not found.');
 } catch(e) {
 if(e instanceof ZodError)return json({error:'Check your input.',details:e.issues.map(i=>({path:i.path.join('.'),message:i.message}))},400);
 if(e instanceof HttpError)return json({error:e.message},e.status);
 console.error(JSON.stringify({event:'request.failed',type:e instanceof Error?e.name:'unknown'}));
 return json({error:'Unable to complete the request. Please try again.'},500);
 }
}
export const GET=handle;export const POST=handle;export const PATCH=handle;export const DELETE=handle;
