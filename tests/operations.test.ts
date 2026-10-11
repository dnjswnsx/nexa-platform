import {afterAll,beforeEach,expect,it,vi} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {calculateScenario} from '../src/planning';
const dir=mkdtempSync(join(tmpdir(),'nexa-operations-'));
process.env.NEXA_DB_PATH=join(dir,'test.sqlite');
delete process.env.NEXA_AI_API_KEY;delete process.env.OPENAI_API_KEY;
const {db,id,now,one,run}=await import('../src/db');
const {operationsData,taskData,createTask,updateTask,ownerBrief}=await import('../src/operations');
const {academyMutation}=await import('../src/academy');
const {createInquiry}=await import('../src/inquiries');
const {GET,PATCH}=await import('../src/app/api/[...path]/route');
const {hash,token}=await import('../src/security');
let org:string,other:string,user:string,outsider:string;
beforeEach(()=>{
 vi.unstubAllGlobals();delete process.env.NEXA_AI_API_KEY;
 db.exec('DELETE FROM organizations;DELETE FROM users;DELETE FROM rate_limits;');
 org=id();other=id();user=id();outsider=id();
 for(const [u,name] of [[user,'Private Owner Name'],[outsider,'Other Owner']])run('INSERT INTO users VALUES(?,?,?,?,?)',u,`${u}@example.test`,'hash',name,now());
 for(const o of [org,other])run('INSERT INTO organizations VALUES(?,?,?,?,?,?,?,?,?,?)',o,'Private Academy Name','','Asia/Seoul','ko','KR','',id(),'[]',now());
 run('INSERT INTO members VALUES(?,?,?)',org,user,'owner');run('INSERT INTO members VALUES(?,?,?)',other,outsider,'owner');
});
afterAll(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
it('finds overdue follow-ups and only counts unresolved new staff inquiries',()=>{
 const inquiry=createInquiry(org,{name:'Private Parent',email:'parent@example.test',phone:'',message:'Private message',channel:'call',source:'call',consent:true,adult:true,requestKey:id()},user);
 run('UPDATE inquiry_details SET follow_up_at=? WHERE conversation_id=?',new Date(Date.now()-3600000).toISOString(),inquiry.conversationId);
 expect(operationsData(org).counts).toMatchObject({overdue:1,unanswered:1});
 expect(operationsData(other).counts).toMatchObject({overdue:0,unanswered:0});
 run("UPDATE conversations SET state='closed' WHERE id=?",inquiry.conversationId);
 expect(operationsData(org).counts).toMatchObject({overdue:0,unanswered:0});
 const widget=id();run('INSERT INTO conversations VALUES(?,?,?,?,?)',widget,org,'synthetic-visitor-hash','human',now());
 run('INSERT INTO messages VALUES(?,?,?,?,?)',id(),widget,'visitor','A question requiring a staff answer',now());
 run('INSERT INTO messages VALUES(?,?,?,?,?)',id(),widget,'ai','A staff member will help.',now());
 expect(operationsData(org).counts.unanswered).toBe(1);
 run('INSERT INTO messages VALUES(?,?,?,?,?)',id(),widget,'staff','A reviewed human reply.',now());
 expect(operationsData(org).counts.unanswered).toBe(0);
});
it('stores a suggestion once per source and rejects a stale suggestion',()=>{
 const signal=operationsData(org).suggestions.find(s=>s.section==='knowledge')!;
 const a=createTask(org,user,{suggestionKey:signal.key,locale:'ko',requestKey:id()});
 const b=createTask(org,user,{suggestionKey:signal.key,locale:'ko',requestKey:id()});
 expect(a.id).toBe(b.id);expect(taskData(org).tasks).toHaveLength(1);expect(taskData(org).tasks[0].title).toBe(signal.titleKo);
 run('INSERT INTO knowledge VALUES(?,?,?,?,?)',id(),org,'Hours?','9–5',now());
 expect(()=>createTask(org,user,{suggestionKey:signal.key,requestKey:id()})).toThrow('no longer current');
});
it('persists tasks, enforces tenant boundaries and rejects foreign assignees',()=>{
 const task=createTask(org,user,{title:'Review classes',assignedUserId:user,requestKey:id()});
 expect(()=>updateTask(other,outsider,{id:task.id,status:'done'})).toThrow('not found');
 expect(()=>updateTask(org,user,{id:task.id,assignedUserId:outsider})).toThrow('members of this workspace');
 expect(()=>createTask(org,user,{title:'Wrong assignment',assignedUserId:outsider,requestKey:id()})).toThrow('members of this workspace');
 updateTask(org,user,{id:task.id,status:'done',dueAt:new Date(Date.now()+86400000).toISOString()});
 expect(taskData(org).tasks[0].status).toBe('done');expect(taskData(other).tasks).toHaveLength(0);
});
it('lets staff update the shared plan while protecting owner financial metrics and AI briefs',async()=>{
 run('INSERT INTO members VALUES(?,?,?)',org,outsider,'staff');
 const session=token();run('INSERT INTO sessions VALUES(?,?,?)',hash(session),outsider,new Date(Date.now()+86400000).toISOString());
 const headers={Cookie:`nexa_session=${session}`,Origin:'http://localhost:3000','Content-Type':'application/json'};
 expect((await GET(new Request(`http://localhost:3000/api/orgs/${org}/operations`,{headers}))).status).toBe(403);
 expect((await GET(new Request(`http://localhost:3000/api/orgs/${org}/tasks`,{headers}))).status).toBe(200);
 const task=createTask(org,user,{title:'Shared consultation preparation',assignedUserId:outsider,requestKey:id()});
 expect((await PATCH(new Request(`http://localhost:3000/api/orgs/${org}/tasks`,{method:'PATCH',headers,body:JSON.stringify({id:task.id,status:'done'})}))).status).toBe(200);
 expect(taskData(org).tasks[0].status).toBe('done');
});
it('deduplicates manual task retries and rejects a reused key for different work',()=>{
 const input={title:'Review class schedules',requestKey:id()};
 expect(createTask(org,user,input).id).toBe(createTask(org,user,input).id);
 expect(()=>createTask(org,user,{...input,title:'Different task'})).toThrow('different task');
});
it('uses customized enrollment fees for capacity and planned cost signals',()=>{
 academyMutation(org,user,{action:'class',name:'Private Class Name',monthlyFee:300000,monthlyCost:400000,capacity:1});
 academyMutation(org,user,{action:'student',name:'Private Student Name',guardianEmail:'guardian@example.test',consent:true});
 const cls=String(one('SELECT id FROM classes WHERE org_id=?',org)!.id),student=String(one('SELECT id FROM students WHERE org_id=?',org)!.id);
 academyMutation(org,user,{action:'enroll',classId:cls,studentId:student,monthlyFee:250000});
 const data=operationsData(org);expect(data.classes[0]).toMatchObject({projected:250000,plannedMargin:-150000,utilization:1});
 expect(data.suggestions.map(s=>s.section)).toContain('growth');expect(data.suggestions.some(s=>s.key.endsWith('capacity'))).toBe(true);
});
it('keeps recorded cash separate from projections and preserves missing history',()=>{
 academyMutation(org,user,{action:'ledger',classId:null,kind:'income',amount:220000,category:'Private cash category',occurredAt:now(),requestKey:id()});
 const data=operationsData(org);expect(data.summary.projected).toBe(0);expect(data.cashHistory.at(-1)).toMatchObject({income:220000,expenses:0,entries:1});
 expect(data.cashHistory.slice(0,5).every(m=>m.entries===0)).toBe(true);
});
it('calculates mixed-fee retention, tuition changes and capacity-capped additions from class records',()=>{
 const record={id:id(),name:'Math',students:2,capacity:3,projected:450000,monthlyFee:300000,plannedCost:400000};
 const result=calculateScenario(record,{retention:50,newStudents:3,feeChange:10,extraCost:10000});
 expect(result).toMatchObject({retained:1,acceptedNew:2,capped:true,students:3,seatsRemaining:0,tuition:907500,margin:497500,change:457500});
});
it('handles empty and zero-fee classes without inventing break-even values',()=>{
 expect(calculateScenario({students:0,capacity:5,projected:0,monthlyFee:0,plannedCost:100},{retention:100,newStudents:0,feeChange:0,extraCost:0})).toMatchObject({tuition:0,margin:-100,breakEvenStudents:null});
 expect(()=>calculateScenario({students:1,capacity:1,projected:300,monthlyFee:300,plannedCost:0},{retention:101,newStudents:0,feeChange:0,extraCost:0})).toThrow();
});
it('mocked AI brief sends aggregates without contact, student, class or task text and persists a reviewable result',async()=>{
 createTask(org,user,{title:'Private task title',details:'Private task details',requestKey:id()});
 academyMutation(org,user,{action:'class',name:'Private Class Name',monthlyFee:300000,monthlyCost:100000,capacity:10});
 academyMutation(org,user,{action:'student',name:'Private Student Name',guardianEmail:'private@example.test',consent:true});
 createInquiry(org,{name:'Private Parent',email:'parent@example.test',phone:'',message:'Private message',channel:'call',source:'call',consent:true,adult:true,requestKey:id()},user);
 process.env.NEXA_AI_API_KEY='mock-key';
 const fetchMock=vi.fn<typeof fetch>(async()=>new Response(JSON.stringify({usage:{input_tokens:80,output_tokens:50},output:[{content:[{type:'output_text',text:JSON.stringify({summary:'새 문의를 확인하세요.',actions:[{title:'문의 담당자 배정',reason:'새 문의가 있습니다.',section:'unified',priority:'high'}],limitations:['기록에 기반한 제안입니다.']})}]}]}),{status:200}));vi.stubGlobal('fetch',fetchMock);
 await ownerBrief(org,user,'ko');const payload=JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
 for(const privateText of ['Private','private@example.test','parent@example.test'])expect(payload.input).not.toContain(privateText);
 expect(payload.store).toBe(false);expect(operationsData(org).ai.latest).toBeTruthy();
 expect(one('SELECT purpose FROM usage_events WHERE org_id=?',org)?.purpose).toBe('owner-brief');
});
it('does not store invalid AI actions or claim success when OpenAI is unconfigured',async()=>{
 await expect(ownerBrief(org,user,'en')).rejects.toThrow('not configured');
 process.env.NEXA_AI_API_KEY='mock-key';vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({summary:'Invalid',actions:[{title:'Send automatically',reason:'Invalid target',section:'external-send',priority:'high'}],limitations:[]})}]}]}),{status:200})));
 await expect(ownerBrief(org,user,'en')).rejects.toThrow('invalid owner briefing');expect(operationsData(org).ai.latest).toBeUndefined();
});
