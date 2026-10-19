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
 for(const mode of ['failure','malformed','duplicate']){
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

test('a changed immutable decision is a permanent conflict, with no second email',async()=>{
 const {env,decision,request}=fixture();let calls=0;const provider=async()=>{calls++;return Response.json({id:'email-id'})};
 assert.equal((await serveSignupAdmin(request(),env,provider)).status,200);
 decision.status='rejected';assert.equal((await serveSignupAdmin(request(),env,provider)).status,409);assert.equal(calls,1);
});

test('a corrupt or unreadable record is explicitly partial and does not hide healthy requests',async()=>{
 for(const mode of ['corrupt','unreadable']) {
 const {env,data}=fixture();const bad='a6829b55-2c7d-40a1-bdba-8d056370eced';data.set('request:'+bad,{});
 env.ACCESS_REQUESTS.list=async()=>({keys:[{name:'request:'+id},{name:'request:'+bad}],list_complete:true});
 if(mode==='unreadable'){const read=env.ACCESS_REQUESTS.get;env.ACCESS_REQUESTS.get=async key=>{if(key==='request:'+bad)throw new Error('unavailable');return read(key)}}
 const response=await serveSignupAdmin(new Request('https://mctl.ai/api/internal/invitations/requests'),env);assert.equal(response.status,200);
 const body=await response.json();assert.equal(body.requests.length,1);assert.equal(body.complete,false);assert.equal(body.traversal_complete,true);assert.equal(body.observation,'partial');assert.deepEqual(body.issues,[{id:bad,error:'record_unreadable'}]);
 }
});

test('a rejected decision replay cannot mint an approval mirror',async()=>{
 const {env,decision,request}=fixture();decision.status='rejected';let calls=0;const provider=async()=>{calls++;return Response.json({id:'rejected-id'})};
 assert.equal((await serveSignupAdmin(request(),env,provider)).status,200);
 decision.status='approved';assert.equal((await serveSignupAdmin(request(),env,provider)).status,409);
 assert.equal(await invitationAllowed(env,'19205780'),false);assert.equal(calls,1);
});
test('changed identity, expiry or email reason conflicts before any mirror write',async()=>{
 for(const field of ['github_id','expires_at','reason']) {
 const {env,data,decision,request}=fixture();let calls=0;const provider=async()=>{calls++;return Response.json({id:'email-id'})};
 assert.equal((await serveSignupAdmin(request(),env,provider)).status,200);
 const original=JSON.stringify([...data.entries()]);
 decision[field]=field==='github_id'?'99999999':field==='expires_at'?new Date(Date.now()+5*86400000).toISOString():'Changed reason';
 assert.equal((await serveSignupAdmin(request(),env,provider)).status,409,field);
 assert.equal(JSON.stringify([...data.entries()]),original,'conflict made a durable write');assert.equal(calls,1);assert.equal(await invitationAllowed(env,'99999999'),false);
 }
});
test('an uncertain provider failure binds retries to the original decision too',async()=>{
 const {env,decision,request}=fixture();
 assert.equal((await serveSignupAdmin(request(),env,async()=>new Response(null,{status:503}))).status,503);
 decision.github_id='99999999';let called=false;
 assert.equal((await serveSignupAdmin(request(),env,async()=>{called=true})).status,409);
 assert.equal(called,false);assert.equal(await invitationAllowed(env,'99999999'),false);
 decision.github_id='19205780';assert.equal((await serveSignupAdmin(request(),env,async()=>Response.json({id:'recovered-email'}))).status,200);
});
test('approval shorter than minimum KV TTL is invalid and grants nothing',async()=>{
 const {env,data,decision,request}=fixture();decision.expires_at=new Date(Date.now()+30000).toISOString();let called=false;
 assert.equal((await serveSignupAdmin(request(),env,async()=>{called=true})).status,400);
 assert.equal(await invitationAllowed(env,'19205780'),false);assert.equal(data.has('decision-intent:'+id),false);assert.equal(called,false);
});
