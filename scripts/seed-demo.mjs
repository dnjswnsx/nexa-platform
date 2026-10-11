// Explicitly requested synthetic demo data. Never runs during install/startup.
import {createHash,randomBytes,randomUUID} from 'node:crypto';
const base = new URL(process.env.NEXA_DEMO_URL || 'http://localhost:3000');
if (!['http:','https:'].includes(base.protocol)) throw new Error('Use an HTTP(S) app URL.');
const email = process.env.NEXA_DEMO_EMAIL || `demo-${Date.now()}-${randomBytes(3).toString('hex')}@example.test`;
const password = process.env.NEXA_DEMO_PASSWORD || randomBytes(18).toString('base64url');
let cookie='';
async function api(path,method='GET',data,visitor){
 const headers={'Content-Type':'application/json',Origin:base.origin};
 if(cookie)headers.Cookie=cookie;
 if(visitor)headers['x-visitor-token']=visitor;
 const response=await fetch(new URL('/api/'+path,base),{method,headers,body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(30000)});
 const b=await response.json();
 if(!response.ok)throw new Error(`${method} ${path}: ${response.status} ${b.error||'Request failed'}`);
 const session=response.headers.get('set-cookie');if(session)cookie=session.split(';')[0];
 return b;
}
const key=value=>{const h=createHash('sha256').update(value).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const daysAhead=n=>{const d=new Date();d.setUTCDate(d.getUTCDate()+n);d.setUTCHours(5,0,0,0);return d;};
try{
 await api('auth/register','POST',{name:'Demo Academy Owner [TEST]',email,password});
 const {id:org}=await api('orgs','POST',{name:'NEXA Test Academy [DEMO]',description:'SYNTHETIC TEST DATA ONLY. Fictional Korean academy used to explore NEXA. No real students, payments or customer activity.',timezone:'Asia/Seoul',locale:'en',country:'KR',email:'academy@example.test'});
 const qs=[['What are your hours?','[DEMO] Monday–Friday, 2pm–8pm (Asia/Seoul).'],['What classes do you offer?','[DEMO] Math, robotics and English classes.'],['운영 시간이 어떻게 되나요?','[데모] 평일 오후 2시부터 8시까지 운영합니다.'],['어떤 수업이 있나요?','[데모] 수학, 로봇공학, 영어 수업을 제공합니다.']];
 for(const [question,answer] of qs)await api(`orgs/${org}/knowledge`,'POST',{question,answer});
 for(const c of [{name:'Math Foundations [TEST]',monthlyFee:280000,monthlyCost:700000,capacity:12},{name:'Robotics Lab [TEST]',monthlyFee:350000,monthlyCost:800000,capacity:8},{name:'English Conversation [TEST]',monthlyFee:240000,monthlyCost:400000,capacity:10}])await api(`orgs/${org}/academy`,'POST',{action:'class',...c});
 for(let i=1;i<=12;i++)await api(`orgs/${org}/academy`,'POST',{action:'student',name:`Test Student ${String(i).padStart(2,'0')}`,guardianEmail:`test-guardian-${i}@example.test`,consent:true});
 let academy=await api(`orgs/${org}/academy`);
 for(let i=0;i<academy.students.length;i++){
 const c=academy.classes[i%3];
 await api(`orgs/${org}/academy`,'POST',{action:'enroll',studentId:academy.students[i].id,classId:c.id,monthlyFee:Number(c.monthly_fee)-(i%4===0?20000:0)});
 }
 for(const [i,c] of academy.classes.entries()){
 await api(`orgs/${org}/academy`,'POST',{action:'ledger',classId:c.id,kind:'income',amount:Number(c.monthly_fee)*3,category:'Synthetic tuition receipt [TEST]',occurredAt:new Date().toISOString(),requestKey:key(`${org}-income-${i}`)});
 await api(`orgs/${org}/academy`,'POST',{action:'ledger',classId:c.id,kind:'expense',amount:Number(c.monthly_cost),category:'Synthetic teaching costs [TEST]',occurredAt:new Date().toISOString(),requestKey:key(`${org}-expense-${i}`)});
 }
 let dashboard=await api(`orgs/${org}`);const agent=dashboard.organization.agent_id;
 for(let i=1;i<=3;i++){
 const start=daysAhead(i);await api(`orgs/${org}/slots`,'POST',{startsAt:start.toISOString(),endsAt:new Date(start.getTime()+1800000).toISOString()});
 }
 for(let i=1;i<=3;i++){
 const session=await api(`public/${agent}/session`,'POST',{hostOrigin:base.origin});const visitor=session.visitorToken;
 await api(`public/${agent}/message`,'POST',{message:i===2?'What classes do you offer?':'What are your hours?',locale:'en'},visitor);
 const lead=await api(`public/${agent}/lead`,'POST',{name:`Test Guardian ${i}`,email:`test-lead-${i}@example.test`,interest:['Math','Robotics','English'][i-1]+' inquiry [TEST]',consent:true,adult:true},visitor);
 if(i===1){const thread=await api(`public/${agent}`,'GET',undefined,visitor);await api(`public/${agent}/book`,'POST',{slotId:thread.slots[0].id,leadId:lead.leadId,requestKey:randomUUID(),confirmed:true},visitor);}
 if(i===2){await api(`public/${agent}/handoff`,'POST',{},visitor);await api(`orgs/${org}/inbox`,'PATCH',{id:session.conversationId,reply:'[TEST] A demo staff member can help you choose a class. This is synthetic activity.'});}
 if(i===3)await api(`orgs/${org}/leads`,'PATCH',{id:lead.leadId,status:'Qualified'});
 }
 academy=await api(`orgs/${org}/academy`);dashboard=await api(`orgs/${org}`);
 if(academy.students.length!==12||academy.enrollments.length!==12||dashboard.leads.length!==3||dashboard.appointments.length!==1)throw new Error('Seed verification failed.');
 await api('auth/logout','POST',{});
 await api('auth/login','POST',{email,password});const auth=await api('auth');if(!auth.user||!auth.organizations.some(o=>o.id===org))throw new Error('Demo login verification failed.');
 console.log(JSON.stringify({loginUrl:new URL('/app',base).href,email,password,organization:'NEXA Test Academy [DEMO]',verified:{students:academy.students.length,classes:academy.classes.length,enrollments:academy.enrollments.length,ledgerEntries:academy.ledger.length,conversations:dashboard.conversations.length,leads:dashboard.leads.length,bookings:dashboard.appointments.length,projectedMonthlyKRW:academy.summary.projected},notice:'All data is synthetic. No emails, payments or OpenAI calls were made. Keep this password private; do not commit it.'},null,2));
}catch(error){console.error(error.message);console.error('A partial demo may exist if a later request failed. Existing accounts are never overwritten.');process.exitCode=1;}
