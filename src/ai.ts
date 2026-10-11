import {z} from 'zod';
import {all,id,now,run} from './db';
import {HttpError,limit} from './security';
export const aiConfigured=()=>Boolean(process.env.NEXA_AI_API_KEY||process.env.OPENAI_API_KEY);
export const aiModel=()=>process.env.NEXA_AI_MODEL||process.env.OPENAI_MODEL||'gpt-4.1-mini';
export async function structuredAI(org:string,purpose:string,instructions:string,input:unknown,schema:Record<string,unknown>,maxTokens=1000){
 const key=process.env.NEXA_AI_API_KEY||process.env.OPENAI_API_KEY;if(!key)throw new HttpError(503,'OpenAI is not configured. Set NEXA_AI_API_KEY in environment settings.');
 limit(`ai-daily:${org}`,Number(process.env.NEXA_AI_DAILY_CAP||100),86400);
 let response:Response;try{response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:AbortSignal.timeout(25000),headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:aiModel(),max_output_tokens:maxTokens,store:false,instructions,input:JSON.stringify(input),text:{format:{type:'json_schema',name:'nexa_response',strict:true,schema}}})});}catch{throw new HttpError(503,'OpenAI request failed. Please try again or contact a person.');}
 if(!response.ok)throw new HttpError(503,`OpenAI request failed (${response.status}). Check the key, model access and API billing.`);
 const data=await response.json();const usage=data.usage||{};run('INSERT INTO usage_events VALUES(?,?,?,?,?,?,?)',id(),org,purpose,aiModel(),Number(usage.input_tokens||0),Number(usage.output_tokens||0),now());
 const raw=(data.output||[]).flatMap((o:{content?:{type?:string,text?:string}[]})=>o.content||[]).filter((c:{type?:string})=>c.type==='output_text').map((c:{text?:string})=>c.text||'').join('');
 try{return JSON.parse(raw);}catch{throw new HttpError(503,'AI did not return a valid structured response.');}
}
export const advisorySchema={type:'object',properties:{summary:{type:'string'},recommendations:{type:'array',items:{type:'object',properties:{classId:{type:'string'},explanation:{type:'string'},actions:{type:'array',items:{type:'string'}}},required:['classId','explanation','actions'],additionalProperties:false}},limitations:{type:'array',items:{type:'string'}}},required:['summary','recommendations','limitations'],additionalProperties:false};
export const adviceValidator=z.object({summary:z.string().max(4000),recommendations:z.array(z.object({classId:z.string().uuid(),explanation:z.string().max(2000),actions:z.array(z.string().max(1000)).max(5)})).max(30),limitations:z.array(z.string().max(1000)).max(10)});
export function usageFor(org:string){return all('SELECT purpose,model,sum(input_tokens) AS input_tokens,sum(output_tokens) AS output_tokens,count(*) AS requests FROM usage_events WHERE org_id=? GROUP BY purpose,model',org);}
