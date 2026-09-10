import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Content-Type':'application/json'};
const json = (value:unknown,status=200) => new Response(JSON.stringify(value),{status,headers});
const MAX_FILE = 25*1024*1024;
const MAX_TEXT = 8*1024*1024;
const TEXT_EXT = /\.(txt|md|csv|json|html?|xml|vtt|srt|log|rtf|eml)$/i;
const safeName = (name:string) => name.replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-140) || 'transcript.txt';
const hex = (bytes:ArrayBuffer) => [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');

serve(async req => {
 if(req.method==='OPTIONS') return new Response('ok',{headers});
 if(req.method!=='POST') return json({error:'Method not allowed'},405);
 try {
  const url=Deno.env.get('SUPABASE_URL')!;const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth=req.headers.get('Authorization')||'';const userDb=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}});
  const {data:authData}=await userDb.auth.getUser();if(!authData.user)return json({error:'Sign in first'},401);
  const form=await req.formData();const file=form.get('file');const clientId=String(form.get('clientId')||'');const meetingId=String(form.get('meetingId')||'');
  if(!(file instanceof File)||!clientId||!meetingId)return json({error:'Choose a transcript file and meeting'},400);
  if(file.size<1||file.size>MAX_FILE)return json({error:'Each source must be between 1 byte and 25 MB'},413);
  const {data:bundle,error:access}=await userDb.rpc('client_meeting_bundle',{p_client_id:clientId});
  if(access||!bundle?.canEdit||!bundle.meetings?.some((m:{id:string})=>m.id===meetingId))return json({error:'Meeting edit permission required'},403);
  const bytes=new Uint8Array(await file.arrayBuffer());const digest=hex(await crypto.subtle.digest('SHA-256',bytes));
  const admin=createClient(url,service);const {data:client}=await admin.from('clients').select('workspace_id').eq('id',clientId).single();if(!client)return json({error:'Client not found'},404);
  const {data:existing}=await admin.from('client_meeting_sources').select('id,original_name').eq('meeting_id',meetingId).eq('sha256',digest).maybeSingle();
  if(existing)return json({error:`${existing.original_name} is already attached to this meeting`},409);
  let text=String(form.get('extractedText')||'');const manifest:{name:string;characters:number}[]=[];const ignored:string[]=[];
  const isZip=/\.zip$/i.test(file.name)||/zip/i.test(file.type);
  if(isZip){
   const {unzipSync}=await import('https://esm.sh/fflate@0.8.2');const entries=unzipSync(bytes);const names=Object.keys(entries);
   if(names.length>250)throw new Error('ZIP contains more than 250 entries. Split it into smaller transcript packages.');
   const blocks:string[]=[];let total=0;
   for(const name of names){const entry=entries[name];if(!TEXT_EXT.test(name)){if(!name.endsWith('/'))ignored.push(name);continue;}total+=entry.byteLength;if(total>MAX_TEXT)throw new Error('Extracted transcript text exceeds 8 MB. Split this ZIP into smaller meeting packages.');const value=new TextDecoder().decode(entry).replace(/\0/g,'').trim();if(value){blocks.push(`[Source file: ${name}]\n${value}`);manifest.push({name,characters:value.length});}}
   text=blocks.join('\n\n');
  } else {
   if(!text&&TEXT_EXT.test(file.name))text=new TextDecoder().decode(bytes).replace(/\0/g,'').trim();
   if(!text)throw new Error('No readable text was found. For scanned PDFs, run OCR first or paste the transcript.');
   if(new TextEncoder().encode(text).byteLength>MAX_TEXT)throw new Error('Extracted transcript text exceeds 8 MB. Split it into smaller files.');
   manifest.push({name:file.name,characters:text.length});
  }
  if(!text.trim())throw new Error('No supported transcript text was found in this file.');
  const id=crypto.randomUUID();const mime=isZip?'application/zip':file.type||'text/plain';const path=`${client.workspace_id}/${clientId}/${meetingId}/${id}/${safeName(file.name)}`;
  const up=await admin.storage.from('client-meeting-sources').upload(path,bytes,{contentType:mime,upsert:false});if(up.error)throw new Error('The source file could not be stored securely.');
  const {data:source,error}=await admin.from('client_meeting_sources').insert({id,tenant_id:client.workspace_id,client_id:clientId,meeting_id:meetingId,original_name:file.name,mime_type:mime,byte_size:file.size,storage_path:path,sha256:digest,extracted_text:text,manifest,uploaded_by:authData.user.id}).select('id,meeting_id,original_name,mime_type,byte_size,manifest,created_at').single();
  if(error){await admin.storage.from('client-meeting-sources').remove([path]);throw new Error('The transcript source could not be recorded.');}
  return json({source,ignored:ignored.slice(0,50)});
 } catch(e){return json({error:e instanceof Error?e.message:'Transcript upload failed'},400);}
});
