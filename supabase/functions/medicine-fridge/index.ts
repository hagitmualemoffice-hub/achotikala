import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createSchema, requestSchema, manageSchema, gateSchema } from './validation.ts';
const encoder=new TextEncoder();
const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
async function hash(value:string) {return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));}
async function hmac(value:string,key:string) {const k=await crypto.subtle.importKey('raw',encoder.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(new Uint8Array(await crypto.subtle.sign('HMAC',k,encoder.encode(value))));}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,'Content-Type':'application/json','Cache-Control':'no-store'}});
 const fail=()=>reply({error:'לא הצלחנו להשלים כרגע. בדקי את הפרטים ונסי שוב מאוחר יותר.'},400);
 try {
  if(req.method!=='POST' || Number(req.headers.get('content-length')??0)>12000)return fail();
  const raw=await req.text();if(raw.length>12000)return fail();const input=JSON.parse(raw);
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');const url=Deno.env.get('SUPABASE_URL');if(!key||!url)return fail();
  // The gateway forwards the client address; only a keyed digest ever leaves this handler.
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const ipHash=await hmac(`medicine-ip:${ip}`,key);
  if(input.action==='challenge') {const issued=Date.now();const nonce=hex(crypto.getRandomValues(new Uint8Array(16)));const value=`${issued}.${nonce}.${ipHash}`;return reply({challenge:`${issued}.${nonce}.${await hmac(value,key)}`});}
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  if(input.action==='manage') {const parsed=manageSchema.safeParse(input);if(!parsed.success)return fail();const {data,error}=await db.rpc('medicine_manage',{token_hash:await hash(parsed.data.token),next_status:parsed.data.status});return error||!data?fail():reply({ok:true});}
  const gate=gateSchema.safeParse(input);if(!gate.success)return fail();const [issued,nonce,signature]=gate.data.challenge.split('.');const age=Date.now()-Number(issued);
  if(!nonce||!signature||!Number.isFinite(age)||age<3000||age>7200000||signature!==await hmac(`${issued}.${nonce}.${ipHash}`,key))return fail();
  const parsed=input.action==='create'?createSchema.safeParse(input):requestSchema.safeParse(input);if(!parsed.success)return fail();
  const token=hex(crypto.getRandomValues(new Uint8Array(32)));
  const p={...parsed.data,...(parsed.data.action==='create'?{expiry_month:`${parsed.data.expiry_month}-01`,opened_on:parsed.data.sealed?'':parsed.data.opened_on,opened_note:parsed.data.sealed?'':parsed.data.opened_note}:{})};
  const {data,error}=await db.rpc('medicine_submit',{p,ip_key:ipHash,phone_key:await hmac(`medicine-phone:${parsed.data.phone.replace(/^0/,'+972')}`,key),token_hash:await hash(token)});
  if(error)return fail();return reply(parsed.data.action==='create'?{id:data,token}:{ok:true});
 } catch {return fail();}
});
