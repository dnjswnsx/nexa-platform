import { z } from 'zod';
import { academyData } from './academy';
import { aiConfigured, aiModel, structuredAI } from './ai';
import { all, db, id, now, one, run } from './db';
import { audit, HttpError } from './security';

export const taskSections = ['unified','academy','growth','appointments','knowledge','agent','settings'] as const;
const section = z.enum(taskSections);
const priority = z.enum(['high','medium','low']);
const dueAt = z.iso.datetime().nullable();
type Suggestion = {key:string;title:string;titleKo:string;detail:string;detailKo:string;section:typeof taskSections[number];priority:'high'|'medium'|'low'};

export function taskData(org:string) {
 return {
  tasks: all(`SELECT t.*,u.name AS assigned_name FROM owner_tasks t LEFT JOIN users u ON u.id=t.assigned_user_id
   WHERE t.org_id=? ORDER BY t.status DESC,CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,t.created_at DESC`,org),
  members: all('SELECT u.id,u.name FROM members m JOIN users u ON u.id=m.user_id WHERE m.org_id=? ORDER BY u.name',org),
 };
}
export function operationsData(org:string) {
 const academy=academyData(org);
 const time=now();const horizon=new Date(Date.now()+86400000).toISOString();const day=time.slice(0,10);
 const inquiry=one(`SELECT count(*) AS total,
  sum(CASE WHEN c.state!='closed' AND COALESCE(d.status,w.status,'new')!='resolved'
   AND COALESCE(d.follow_up_at,w.follow_up_at)<=? THEN 1 ELSE 0 END) AS overdue,
  sum(CASE WHEN c.state='human' AND COALESCE(d.status,w.status,'new')='new'
   AND (SELECT role FROM messages WHERE conversation_id=c.id ORDER BY rowid DESC LIMIT 1) IN ('visitor','ai') THEN 1 ELSE 0 END) AS unanswered
  FROM conversations c LEFT JOIN inquiry_details d ON d.conversation_id=c.id
  LEFT JOIN inquiry_controls w ON w.conversation_id=c.id WHERE c.org_id=?`,time,org)!;
 const upcoming=all(`SELECT a.id,l.name,s.starts_at FROM appointments a JOIN slots s ON s.id=a.slot_id JOIN leads l ON l.id=a.lead_id
  WHERE a.org_id=? AND a.status='confirmed' AND s.starts_at>=? AND s.starts_at<=? ORDER BY s.starts_at`,org,time,horizon);
 const faqCount=Number(one('SELECT count(*) AS n FROM knowledge WHERE org_id=?',org)?.n||0);
 const slotsCount=Number(one('SELECT count(*) AS n FROM slots WHERE org_id=? AND starts_at>?',org,time)?.n||0);
 const leads=Number(one('SELECT count(*) AS n FROM leads WHERE org_id=?',org)?.n||0);
 const suggestions:Suggestion[]=[];
 const add=(key:string,title:string,titleKo:string,detail:string,detailKo:string,target:Suggestion['section'],p:Suggestion['priority']='medium')=>suggestions.push({key:`${day}:${key}`,title,titleKo,detail,detailKo,section:target,priority:p});
 const overdue=Number(inquiry.overdue||0),unanswered=Number(inquiry.unanswered||0);
 if(overdue)add('followups',`Follow up on ${overdue} overdue ${overdue===1?'inquiry':'inquiries'}`,`후속 연락 기한이 지난 문의 ${overdue}건`,
  'Scheduled follow-ups are due. Open the inbox, check each family’s consent and record the next step.',
  '후속 연락 기한이 지났습니다. 문의함에서 동의 여부를 확인하고 다음 단계를 기록하세요.','unified','high');
 if(unanswered)add('unanswered',`Review ${unanswered} new ${unanswered===1?'inquiry':'inquiries'} awaiting staff`,`직원 답변을 기다리는 새 문의 ${unanswered}건`,
  'These open staff conversations have a visitor message and a new status. Assign an owner and review a reply.',
  '새 문의 상태이며 직원 상담을 기다리는 메시지가 있습니다. 담당자를 정하고 답변을 검토하세요.','unified','high');
 if(upcoming.length)add('appointments',`Prepare for ${upcoming.length} ${upcoming.length===1?'consultation':'consultations'} in the next 24 hours`,`24시간 내 상담 ${upcoming.length}건 준비`,
  'Review the confirmed appointments and the family’s inquiry before the consultation.',
  '확정된 예약과 가족의 문의 내용을 확인하고 상담을 준비하세요.','appointments');
 const negative=academy.analysis.filter(c=>c.plannedMargin<0);
 if(negative.length)add('costs',`Review ${negative.length} ${negative.length===1?'class':'classes'} with a planned loss`,`계획 이익이 마이너스인 수업 ${negative.length}개 점검`,
  'Recorded recurring tuition is below planned class costs. Test enrollment and cost assumptions in the growth planner.',
  '등록된 월 수업료가 수업 계획 비용보다 적습니다. 성장 플래너에서 등록과 비용 가정을 비교하세요.','growth','high');
 const nearCapacity=academy.analysis.filter(c=>c.utilization>=.9);
 if(nearCapacity.length)add('capacity',`Plan capacity for ${nearCapacity.length} busy ${nearCapacity.length===1?'class':'classes'}`,`정원이 거의 찬 수업 ${nearCapacity.length}개 운영 계획`,
  'These classes use at least 90% of their seats. Check staffing and scheduling before adding enrollment.',
  '정원의 90% 이상이 찼습니다. 추가 등록 전에 강사 배치와 시간표를 확인하세요.','academy');
 const declining=academy.analysis.filter(c=>c.netGrowth<0);
 if(declining.length)add('retention',`Review enrollment decline in ${declining.length} ${declining.length===1?'class':'classes'}`,`등록이 감소한 수업 ${declining.length}개 점검`,
  'Exits exceed joins over the last 30 days. Review class feedback and aggregate reasons for withdrawal.',
  '최근 30일간 신규 등록보다 등록 종료가 많았습니다. 수업 피드백과 전체적인 퇴원 사유를 검토하세요.','growth');
 if(!faqCount)add('faq','Give your assistant its first approved answers','상담원에게 첫 승인 답변 등록',
  'Add tuition, class schedules and consultation policies that your team has approved.',
  '팀에서 승인한 수업료, 시간표, 상담 정책을 등록하세요.','knowledge');
 const cashHistory=Array.from({length:6},(_,index)=>{
  const date=new Date();date.setUTCDate(1);date.setUTCHours(0,0,0,0);date.setUTCMonth(date.getUTCMonth()-5+index);
  const month=date.toISOString().slice(0,7);const entries=academy.ledger.filter(l=>String(l.occurred_at).startsWith(month));
  return {month,income:entries.filter(l=>l.kind==='income').reduce((n,l)=>n+Number(l.amount),0),expenses:entries.filter(l=>l.kind==='expense').reduce((n,l)=>n+Number(l.amount),0),entries:entries.length};
 });
 return {
  ...taskData(org),currency:academy.currency,summary:academy.summary,
  classes:academy.analysis.map(c=>({...c,monthlyFee:Number(academy.classes.find(row=>row.id===c.id)!.monthly_fee)})),
  counts:{overdue,unanswered,inquiries:Number(inquiry.total),leads,upcoming:upcoming.length},upcoming,suggestions,cashHistory,
  setup:{classes:academy.classes.length>0,students:academy.summary.activeStudents>0,knowledge:faqCount>0,availability:slotsCount>0},
  ai:{configured:aiConfigured(),latest:one('SELECT id,response,locale,model,created_at FROM owner_briefs WHERE org_id=? ORDER BY rowid DESC LIMIT 1',org)},
 };
}

function checkAssignee(org:string,user:string|null) {
 if(user&&!one('SELECT user_id FROM members WHERE org_id=? AND user_id=?',org,user))throw new HttpError(400,'Assign tasks only to members of this workspace.');
}
export function createTask(org:string,user:string,input:unknown) {
 const suggestionInput=z.object({suggestionKey:z.string().max(200),locale:z.enum(['en','ko']).default('en'),requestKey:z.string().uuid()}).safeParse(input);
 let data:{title:string;details:string;section:typeof taskSections[number];priority:'high'|'medium'|'low';dueAt:string|null;assignedUserId:string|null;requestKey:string};
 let source:string|null=null;
 if(suggestionInput.success){
  const v=suggestionInput.data;const s=operationsData(org).suggestions.find(s=>s.key===v.suggestionKey);
  if(!s)throw new HttpError(409,'This suggestion is no longer current. Refresh your workspace.');
  source=s.key;const ko=v.locale==='ko';data={title:ko?s.titleKo:s.title,details:ko?s.detailKo:s.detail,section:s.section,priority:s.priority,dueAt:null,assignedUserId:user,requestKey:v.requestKey};
 }else{
  data=z.object({title:z.string().trim().min(1).max(200),details:z.string().trim().max(2000).default(''),section:section.default('academy'),priority:priority.default('medium'),dueAt:dueAt.default(null),assignedUserId:z.string().uuid().nullable().default(null),requestKey:z.string().uuid()}).parse(input);
 }
 checkAssignee(org,data.assignedUserId);
 return db.transaction(()=>{
  const prior=one('SELECT * FROM owner_tasks WHERE org_id=? AND request_key=?',org,data.requestKey);
  if(prior){
   if(prior.title!==data.title||prior.details!==data.details||prior.section!==data.section||prior.priority!==data.priority||prior.due_at!==data.dueAt||prior.source_key!==source||prior.assigned_user_id!==data.assignedUserId)throw new HttpError(409,'This request key belongs to a different task.');
   return {id:prior.id};
  }
  if(source){const existing=one('SELECT id FROM owner_tasks WHERE org_id=? AND source_key=?',org,source);if(existing)return {id:existing.id};}
  const task=id(),time=now();run('INSERT INTO owner_tasks VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',task,org,data.title,data.details,data.section,data.priority,'todo',data.dueAt,data.assignedUserId,source,data.requestKey,user,time,time);
  audit(org,user,'task.created');return {id:task};
 }).immediate();
}
export function updateTask(org:string,user:string,input:unknown) {
 const v=z.object({id:z.string().uuid(),status:z.enum(['todo','done']).optional(),dueAt:dueAt.optional(),assignedUserId:z.string().uuid().nullable().optional()})
  .refine(v=>v.status!==undefined||v.dueAt!==undefined||v.assignedUserId!==undefined,'Choose a task change.').parse(input);
 return db.transaction(()=>{
  const task=one('SELECT * FROM owner_tasks WHERE id=? AND org_id=?',v.id,org);if(!task)throw new HttpError(404,'Task not found.');
  if(v.assignedUserId!==undefined)checkAssignee(org,v.assignedUserId);
  run('UPDATE owner_tasks SET status=?,due_at=?,assigned_user_id=?,updated_at=? WHERE id=? AND org_id=?',v.status??String(task.status),v.dueAt===undefined?task.due_at:v.dueAt,v.assignedUserId===undefined?task.assigned_user_id:v.assignedUserId,now(),v.id,org);
  audit(org,user,'task.updated');return {ok:true};
 }).immediate();
}

export const briefValidator=z.object({
 summary:z.string().max(3000),actions:z.array(z.object({title:z.string().min(1).max(200),reason:z.string().max(1500),section,priority})).max(6),
 limitations:z.array(z.string().max(1000)).max(6),
});
const briefSchema={type:'object',properties:{summary:{type:'string'},actions:{type:'array',items:{type:'object',properties:{title:{type:'string'},reason:{type:'string'},section:{type:'string',enum:taskSections},priority:{type:'string',enum:['high','medium','low']}},required:['title','reason','section','priority'],additionalProperties:false}},limitations:{type:'array',items:{type:'string'}}},required:['summary','actions','limitations'],additionalProperties:false};
export async function ownerBrief(org:string,user:string,locale:'en'|'ko') {
 const data=operationsData(org);
 // No contact, conversation text, task text, class names or student details are sent.
 const snapshot={currency:data.currency,summary:data.summary,counts:data.counts,setup:data.setup,
  tasks:{open:data.tasks.filter(t=>t.status==='todo').length,done:data.tasks.filter(t=>t.status==='done').length},
  classes:data.classes.map(c=>({id:c.id,students:c.students,capacity:c.capacity,projected:c.projected,monthlyFee:c.monthlyFee,plannedCost:c.plannedCost,plannedMargin:c.plannedMargin,actualIncome:c.actualIncome,netGrowth:c.netGrowth,utilization:c.utilization})),cashHistory:data.cashHistory,
  method:'Tuition is a current active-fee baseline, not collected cash. Ledger months are UTC. No seasonality, tax, unpaid invoices or causal growth evidence.'};
 const raw=await structuredAI(org,'owner-brief',`Write a concise academy owner's daily briefing in ${locale==='ko'?'Korean':'English'} from aggregate records. Prioritize concrete staff-reviewed actions. Use only provided facts; zero cash can mean no entries. Never claim guaranteed growth, overdue tuition, real payment collection or that a message was sent. Priorities are recommendations, not autonomous actions. Do not invent facts, percentages, causal explanations, staff availability or forecasts. Clearly acknowledge limitations. Return at most six actions, for the allowed workspace sections only.`,snapshot,briefSchema,1800);
 const parsed=briefValidator.safeParse(raw);if(!parsed.success)throw new HttpError(503,'AI returned an invalid owner briefing.');
 const brief=id();run('INSERT INTO owner_briefs VALUES(?,?,?,?,?,?,?)',brief,org,aiModel(),locale,JSON.stringify(snapshot),JSON.stringify(parsed.data),now());audit(org,user,'owner-brief.created');return {id:brief,...parsed.data};
}
