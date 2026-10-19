import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSignupAdmin, serveSignupAdmin, invitationAllowed } from './signupAdmin.js';
const id='f6829b55-2c7d-40a1-bdba-8d056370eced';
function fixture(){
 const data=new Map();
 const original={version:1,id,createdAt:new Date().toISOString(),name:'Test Applicant',email:'test@example.com',github:'test-account',project:'Test project'};
 data.set('request:'+id,original);
 const env={RESEND_API_KEY:'test-secret',ACCESS_REQUESTS:{
 async get(key){return data.get(key)??null},
 async put(key,raw){data.set(key,JSON.parse(raw))},
 async list(){return {keys:[{name:'request:'+id}],list_complete:true}},
 }};
 const decision={request:original,status:'approved',github_id:'19205780',github_login:'test-account',expires_at:new Date(Date.now()+6*86400000).toISOString(),reason:'Welcome to the pilot'};
 const request=()=>new Request('https://mctl.ai/api/internal/invitations/decision',{method:'POST',body:JSON.stringify(decision)});
 return {env,data,original,decision,request};
}
test('private transport refuses missing service credentials',async()=>{
 const {env,request}=fixture();env.SESSION_REVOCATION_SUBJECT='123';env.SESSION_REVOCATION_AUDIENCE='456';
 assert.equal((await handleSignupAdmin(request(),env)).status,401);
});
test('approval mirrors only verified numeric identity and sends once with stable key',async()=>{
 const {env,request}=fixture();let calls=0;
 const provider=async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.redirect,'manual');assert.equal(options.headers['Idempotency-Key'],'signup-decision/'+id+'/approved');const body=JSON.parse(options.body);assert.deepEqual(body.to,['test@example.com']);return Response.json({id:'email-123'})};
 assert.equal(await invitationAllowed(env,'19205780'),false);
 assert.equal((await serveSignupAdmin(request(),env,provider)).status,200);
 assert.equal(await invitationAllowed(env,'19205780'),true);
 assert.equal((await serveSignupAdmin(request(),env,provider)).status,200);assert.equal(calls,1);
});
test('rejection email grants no identity access',async()=>{
 const {env,decision,request}=fixture();decision.status='rejected';decision.reason='Pilot capacity is currently unavailable';
 assert.equal((await serveSignupAdmin(request(),env,async()=>Response.json({id:'rejected-email'}))).status,200);
 assert.equal(await invitationAllowed(env,'19205780'),false);
});
test('changed recipient cannot send or grant',async()=>{
 const {env,decision,request}=fixture();decision.request={...decision.request,email:'different@example.com'};let called=false;
 assert.equal((await serveSignupAdmin(request(),env,async()=>{called=true})).status,409);assert.equal(called,false);assert.equal(await invitationAllowed(env,'19205780'),false);
});
test('provider redirect/invalid receipt remains pending without delivery receipt',async()=>{
 for(const response of [new Response(null,{status:302,headers:{Location:'https://example.org'}}),Response.json({})]){
 const {env,data,request}=fixture();assert.equal((await serveSignupAdmin(request(),env,async()=>response)).status,503);assert.equal(data.has('decision-delivered:'+id),false);
 }
});
test('listing failures and corrupt records are unavailable, never empty queue',async()=>{
 for(const mode of ['failure','malformed','corrupt','duplicate']){
 const {env,data}=fixture();
 if(mode==='failure')env.ACCESS_REQUESTS.list=async()=>{throw new Error('unavailable')};
 if(mode==='malformed')env.ACCESS_REQUESTS.list=async()=>({keys:[]});
 if(mode==='corrupt')data.set('request:'+id,{});
 if(mode==='duplicate')env.ACCESS_REQUESTS.list=async()=>({keys:[{name:'request:'+id},{name:'request:'+id}],list_complete:true});
 assert.equal((await serveSignupAdmin(new Request('https://mctl.ai/api/internal/invitations/requests'),env)).status,503);
 }
 const {env}=fixture();const response=await serveSignupAdmin(new Request('https://mctl.ai/api/internal/invitations/requests'),env);assert.equal(response.status,200);assert.equal((await response.json()).requests.length,1);
});
test('expired approval denies, unreadable or malformed approval throws',async()=>{
 const {env,data}=fixture();data.set('approved:19205780',{version:1,id,github_id:'19205780',expires_at:new Date(Date.now()-1000).toISOString()});assert.equal(await invitationAllowed(env,'19205780'),false);
 data.set('approved:19205780',{});await assert.rejects(invitationAllowed(env,'19205780'));
 env.ACCESS_REQUESTS.get=async()=>{throw new Error('unavailable')};await assert.rejects(invitationAllowed(env,'19205780'));
});
