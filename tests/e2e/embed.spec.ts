import {test,expect} from '@playwright/test';import {createServer} from 'node:http';import {readFileSync} from 'node:fs';
test('actual script on an approved external origin serves real tenant FAQ',async({page,request})=>{
 const origin={Origin:'http://localhost:3100'};
 await request.post('/api/auth/register',{headers:origin,data:{name:'Embed owner',email:`embed-${Date.now()}@example.test`,password:'embed-test-password-123'}});
 const {id}=await(await request.post('/api/orgs',{headers:origin,data:{name:'Embed Academy',email:'embed@example.test',country:'KR',locale:'en',timezone:'Asia/Seoul'}})).json();
 await request.patch(`/api/orgs/${id}/settings`,{headers:origin,data:{name:'Embed Academy',description:'',origins:['http://localhost:3101']}});
 await request.post(`/api/orgs/${id}/knowledge`,{headers:origin,data:{question:'Where are you located?',answer:'The test office is in Seoul.'}});
 const {organization}=await(await request.get(`/api/orgs/${id}`)).json();
 const server=createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end(readFileSync('public/embed-example.html'));});await new Promise<void>(resolve=>server.listen(3101,'127.0.0.1',resolve));
 try{await page.goto('http://localhost:3101');await page.getByLabel('NEXA origin').fill('http://localhost:3100');await page.getByLabel('Public agent ID').fill(organization.agent_id);await page.getByRole('button',{name:'Load real widget'}).click();await page.getByRole('button',{name:'Chat with us',exact:true}).click();const frame=page.frameLocator('iframe[title="NEXA front desk"]');await frame.getByLabel('Message',{exact:true}).fill('Where are you located?');await frame.getByRole('button',{name:'Send →'}).click();await expect(frame.getByText('The test office is in Seoul.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Close chat',exact:true}).click();await expect(page.locator('iframe')).toBeHidden();}finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});
