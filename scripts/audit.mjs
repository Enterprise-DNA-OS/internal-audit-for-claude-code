#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {table} from './lib/format.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
export const standards='https://www.theiia.org/globalassets/site/standards/condensedglobalinternalauditstandards_2024january9_printable.pdf';
export const reads={
 'plan':['Read engagement scope, risk and workload','select * from audit_plan order by risk desc,due,name'],
 'workpapers':['Read testing and reviewer records','select w.*,e.name as engagement from workpapers w join engagements e on e.id=w.engagement_id order by w.due,w.name'],
 'requests':['Read evidence requests','select r.*,e.name as engagement from requests r join engagements e on e.id=r.engagement_id order by r.due,r.name'],
 'findings':['Read findings and recommended actions','select f.*,e.name as engagement from findings f join engagements e on e.id=f.engagement_id order by f.severity,f.name'],
 'actions':['Read all action records','select * from actions order by due,name'],
 'evidence-chase':['Find outstanding evidence requests','select * from evidence_chase order by days_overdue desc,name'],
 'review-queue':['Find workpapers awaiting independent review','select * from review_queue order by due,name'],
 'follow-up':['Review overdue and unverified actions','select * from action_follow_up order by days_overdue desc,name'],
 'high-risk':['Find high-risk findings still needing action',"select e.name as engagement,f.name,f.severity,count(a.id) as actions,count(a.id) filter(where a.state='verified') as verified from findings f join engagements e on e.id=f.engagement_id left join actions a on a.finding_id=f.id where f.severity in ('high','critical') group by e.name,f.id having count(a.id)=0 or count(a.id) filter(where a.state<>'verified')>0 order by f.name"],
 'unassigned-actions':['Find findings without action plans','select f.id,e.name as engagement,f.name,f.severity from findings f join engagements e on e.id=f.engagement_id where not exists(select 1 from actions a where a.finding_id=f.id) order by f.name'],
 'owner-load':['Compare unresolved action workload',"select owner,count(*) as open_actions,count(*) filter(where due<current_date) as overdue from actions where state<>'verified' group by owner order by overdue desc,owner"],
 'coverage':['Compare evidence and review gaps by engagement','select name,risk,workpapers,awaiting_review,outstanding_requests,open_actions from audit_plan order by risk desc,name'],
 'stale':['Find engagements untouched for 30 days',"select id,name,owner,updated_at from engagements where status<>'closed' and updated_at<now()-interval '30 days' order by updated_at,name"],
 'history':['Read the most recent 100 local operations','select actor,operation,record_id,detail,created_at from history order by created_at desc,id limit 100'],
 'attention':['Read the weekly attention list',"select 'evidence' as kind,name,owner,due,days_overdue from evidence_chase where due<current_date union all select 'action',name,owner,due,days_overdue from action_follow_up where due<current_date order by days_overdue desc,name"],
 'compliance':['Read scoped documentation and follow-up checks','select * from compliance_gaps order by rule,record']
};
const writeUsage={
 'add':'--type=engagement|workpaper|request|finding|action --name=... plus required fields (see help)',
 'stage':'--engagement=... --status=planned|fieldwork|reporting',
 'scope':'--engagement=... --objective=... --scope=...',
 'receive':'--request=... --evidence=...',
 'test':'--workpaper=... --result=pass|fail --evidence=... --conclusion=...',
 'review':'--workpaper=... (actor is the independent reviewer)',
 'implement':'--action=... --evidence=...',
 'verify':'--action=... --evidence=... (actor is the independent verifier)',
 'delay':'--action=... --reason=... (preserves original due date)',
 'close':'--engagement=... --conclusion=... (records approval after checking workpapers)',
 'log':'--engagement=... --note=...',
 'import':'auditboard --file=... --engagement=... [--mapping=...] [--dry-run]'
};
export const commands=[...Object.keys(reads),'engagement','search',...Object.keys(writeUsage),'export','weekly-review','draft-report','help'];
const types={engagement:'engagements',workpaper:'workpapers',request:'requests',finding:'findings',action:'actions'};
function required(o,k){if(typeof o[k]!=='string'||!o[k].trim())throw Error(`Required --${k}`);return o[k].trim();}
function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('Date must be a real YYYY-MM-DD date');return v;}
function choice(v,values){if(!values.includes(v))throw Error(`Expected one of ${values.join(', ')}`);return v;}
function opts(argv){const o={};for(const a of argv.filter(x=>x.startsWith('--'))){const i=a.indexOf('=');const k=a.slice(2,i<0?undefined:i);if(k in o)throw Error(`Duplicate --${k}`);o[k]=i<0?true:a.slice(i+1);}return o;}
export async function resolve(db,type,value){
 const rows=await db.query(`select * from ${types[type]} where lower(name)=lower($1) or id::text=$1 order by name,id`,[value]);
 const candidates=rows.length?rows:await db.query(`select * from ${types[type]} where starts_with(lower(name),lower($1)) or starts_with(id::text,$1) order by name,id`,[value]);
 if(candidates.length!==1)throw Error(`${type}: ${candidates.length?'ambiguous':'not found'}: ${value}\n`+(candidates.length?candidates.map(r=>`${r.id}  ${r.name}`).join('\n'):'Use the list command to inspect records.'));
 return candidates[0];
}
const output=(rows)=>Array.isArray(rows)?(rows.length?table(rows,Object.keys(rows[0]).map(key=>({key,label:key,format:v=>v&&typeof v==='object'?JSON.stringify(v):v}))):'  (none)'):JSON.stringify(rows,null,2);
async function audit(db,actor,operation,row,detail){await db.query('insert into history(actor,operation,record_id,detail) values($1,$2,$3,$4::jsonb)',[actor,operation,row?.id||null,JSON.stringify(detail)]);}
async function mutableEngagement(db,id){const [e]=await db.query('select * from engagements where id=$1',[id]);if(e.status==='closed')throw Error('Engagement is closed; retain approved records and create a new engagement for additional testing');return e;}
function privateFile(dir,name,body){const out=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,dir);fs.mkdirSync(out,{recursive:true});const f=path.join(out,`${name}-${randomUUID()}.md`);fs.writeFileSync(f,body,{flag:'wx',mode:0o600});return f;}
const allowedBase=['json'];
const allowed={
 stage:['engagement','status','actor'],add:['type','name','entity','owner','risk','objective','scope','due','engagement','criteria','procedure','preparer','severity','condition','cause','recommendation','finding','actor'],scope:['engagement','objective','scope','actor'],receive:['request','evidence','actor'],test:['workpaper','result','evidence','conclusion','actor'],review:['workpaper','actor'],implement:['action','evidence','actor'],verify:['action','evidence','actor'],delay:['action','reason','actor'],close:['engagement','conclusion','actor'],log:['engagement','note','actor'],import:['file','engagement','mapping','dry-run','actor'],engagement:['engagement'],search:['text'],export:['out'],'draft-report':['engagement']
};
export async function run(db,argv){
 const cmd=argv[0]||'help',o=opts(argv.slice(1));
 if(!commands.includes(cmd))throw Error(`Unknown command ${cmd}. Use help.`);
 for(const k of Object.keys(o))if(![...allowedBase,...(allowed[cmd]||[])].includes(k))throw Error(`Unknown --${k} for ${cmd}`);
 const positional=argv.slice(1).filter(x=>!x.startsWith('--'));
 if(positional.length && !(cmd==='import'&&positional.length===1&&positional[0]==='auditboard'))throw Error('Unexpected argument; use --name=value flags');
 if(reads[cmd]){const rows=await db.query(reads[cmd][1]);return cmd==='compliance'?rows.map(r=>({...r,source:standards})):rows;}
 if(cmd==='help')return commands.map(command=>({command,usage:reads[command]?.[0]||writeUsage[command]||({engagement:'--engagement=...',search:'--text=...',export:'--out=exports/backup.json','draft-report':'--engagement=...','weekly-review':'Write a private draft from plan, attention, review-queue and compliance',help:'All commands support --json'}[command])})).concat([{command:'add fields',usage:'engagement: entity,owner,due; workpaper: engagement,preparer,due,criteria,procedure; request: engagement,owner,due; finding: engagement,severity,condition; action: finding,owner,due. All: name,actor.'}]);
 if(cmd==='engagement'){const e=await resolve(db,'engagement',required(o,'engagement'));return {engagement:e,workpapers:await db.query('select * from workpapers where engagement_id=$1 order by name',[e.id]),requests:await db.query('select * from requests where engagement_id=$1 order by due,name',[e.id]),findings:await db.query('select * from findings where engagement_id=$1 order by name',[e.id]),notes:await db.query('select * from notes where engagement_id=$1 order by created_at',[e.id])};}
 if(cmd==='search'){const text=required(o,'text');return db.query("select 'engagement' as type,id,name from engagements where strpos(lower(name),lower($1))>0 union all select 'finding',id,name from findings where strpos(lower(name||' '||condition),lower($1))>0 order by type,name",[text]);}
 if(cmd==='export'){
 const data={format:'internal-audit-backup-v1',exported_at:new Date().toISOString(),records:{}};
 await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');try{for(const t of [...Object.values(types),'notes','history'])data.records[t]=await db.query(`select * from ${t} order by id`);await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
 const dest=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,required(o,'out'));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});return {file:dest,counts:Object.fromEntries(Object.entries(data.records).map(([k,v])=>[k,v.length]))};
 }
 if(cmd==='weekly-review'||cmd==='draft-report'){
 let body=`# ${cmd==='weekly-review'?'Weekly internal audit review':'Engagement report'}\n\nPRIVATE DRAFT. Review before issue. Nothing has been sent.\n\n`;
 if(cmd==='draft-report'){
 const e=await resolve(db,'engagement',required(o,'engagement'));body+=`## Engagement\n\n${JSON.stringify(e,null,2)}\n\n`;
 for(const t of ['workpapers','findings','requests'])body+=`## ${t}\n\n${output(await db.query(`select * from ${t} where engagement_id=$1 order by name`,[e.id]))}\n\n`;
 }else for(const c of ['plan','attention','review-queue','compliance'])body+=`## ${c}\n\n${output(await run(db,[c]))}\n\n`;
 return {file:privateFile('drafts',cmd,body)};
 }
 const actor=required(o,'actor');
 await db.exec('BEGIN');
 try{
 let row,result;
 if(cmd==='add'){
 const type=choice(required(o,'type'),Object.keys(types)),name=required(o,'name');let fields={name};
 if(type==='engagement'){
 const risk=Number(o.risk||3);if(!Number.isInteger(risk)||risk<1||risk>5)throw Error('Risk must be 1 to 5');
 fields={...fields,entity:required(o,'entity'),owner:required(o,'owner'),risk,due:date(required(o,'due')),objective:o.objective||'',scope:o.scope||''};
 }else if(type==='action'){const f=await resolve(db,'finding',required(o,'finding'));fields={...fields,finding_id:f.id,owner:required(o,'owner'),due:date(required(o,'due'))};}
 else{
 const e=await resolve(db,'engagement',required(o,'engagement'));await mutableEngagement(db,e.id);fields.engagement_id=e.id;
 if(type==='workpaper')fields={...fields,preparer:required(o,'preparer'),due:date(required(o,'due')),criteria:required(o,'criteria'),procedure:required(o,'procedure')};
 if(type==='request')fields={...fields,owner:required(o,'owner'),due:date(required(o,'due'))};
 if(type==='finding')fields={...fields,severity:choice(required(o,'severity'),['low','medium','high','critical']),condition:required(o,'condition'),cause:o.cause||'',recommendation:o.recommendation||''};
 }
 const keys=Object.keys(fields);[row]=await db.query(`insert into ${types[type]}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(fields));
 }else if(cmd==='stage'){
 const e=await resolve(db,'engagement',required(o,'engagement'));await mutableEngagement(db,e.id);[row]=await db.query('update engagements set status=$2 where id=$1 returning *',[e.id,choice(required(o,'status'),['planned','fieldwork','reporting'])]);
 }else if(cmd==='scope'){
 const e=await resolve(db,'engagement',required(o,'engagement'));await mutableEngagement(db,e.id);[row]=await db.query('update engagements set objective=$2,scope=$3 where id=$1 returning *',[e.id,required(o,'objective'),required(o,'scope')]);
 }else if(cmd==='receive'){
 const q=await resolve(db,'request',required(o,'request'));await mutableEngagement(db,q.engagement_id);if(q.received_at)throw Error('Evidence already received');[row]=await db.query('update requests set evidence=$2,received_at=now() where id=$1 returning *',[q.id,required(o,'evidence')]);
 }else if(cmd==='test'||cmd==='review'){
 const w=await resolve(db,'workpaper',required(o,'workpaper'));await mutableEngagement(db,w.engagement_id);
 if(cmd==='test'){
 if(w.preparer.toLowerCase()!==actor.toLowerCase())throw Error('Actor must match workpaper preparer');
 [row]=await db.query('update workpapers set result=$2,evidence=$3,conclusion=$4,reviewer=null,reviewed_at=null where id=$1 returning *',[w.id,choice(required(o,'result'),['pass','fail']),required(o,'evidence'),required(o,'conclusion')]);
 }else{
 if(w.result==='untested'||!w.evidence.trim()||!w.conclusion.trim())throw Error('Complete testing evidence and conclusion before review');
 if(w.reviewer)throw Error('Workpaper already reviewed');if(actor.toLowerCase()===w.preparer.toLowerCase())throw Error('Independent reviewer must differ from preparer');
 [row]=await db.query('update workpapers set reviewer=$2,reviewed_at=now() where id=$1 returning *',[w.id,actor]);
 }
 }else if(['implement','verify','delay'].includes(cmd)){
 const a=await resolve(db,'action',required(o,'action'));if(a.state==='verified')throw Error('Verified action is closed');
 if(cmd==='implement'){
 if(a.state!=='open')throw Error('Action already implemented');if(actor.toLowerCase()!==a.owner.toLowerCase())throw Error('Actor must match action owner');
 [row]=await db.query("update actions set state='implemented',implementation_evidence=$2 where id=$1 returning *",[a.id,required(o,'evidence')]);
 }else if(cmd==='verify'){
 if(a.state!=='implemented')throw Error('Owner must record implementation before verification');if(actor.toLowerCase()===a.owner.toLowerCase())throw Error('Independent verifier must differ from owner');
 [row]=await db.query("update actions set state='verified',verification_evidence=$2,verified_by=$3,verified_at=now() where id=$1 returning *",[a.id,required(o,'evidence'),actor]);
 }else [row]=await db.query('update actions set delay_reason=$2 where id=$1 returning *',[a.id,required(o,'reason')]);
 }else if(cmd==='close'){
 const e=await resolve(db,'engagement',required(o,'engagement'));await mutableEngagement(db,e.id);
 if(!e.scope.trim()||!e.objective.trim())throw Error('Record scope and objective before approval');
 const [{n}]=await db.query('select count(*)::int as n from workpapers where engagement_id=$1',[e.id]);
 const [{gaps}]=await db.query('select count(*)::int as gaps from workpapers where engagement_id=$1 and reviewed_at is null',[e.id]);
 const [{pending}]=await db.query('select count(*)::int as pending from requests where engagement_id=$1 and received_at is null',[e.id]);
 if(!n||gaps||pending)throw Error('Approval needs tested, independently reviewed workpapers and received evidence requests');
 [row]=await db.query("update engagements set status='closed',conclusion=$2,approved_by=$3,approved_at=now() where id=$1 returning *",[e.id,required(o,'conclusion'),actor]);
 }else if(cmd==='log'){
 const e=await resolve(db,'engagement',required(o,'engagement'));[row]=await db.query('insert into notes(engagement_id,actor,body) values($1,$2,$3) returning *',[e.id,actor,required(o,'note')]);
 }else if(cmd==='import'){
 if(positional[0]!=='auditboard')throw Error('Use import auditboard');
 const e=await resolve(db,'engagement',required(o,'engagement'));await mutableEngagement(db,e.id);
 const csv=parseCsv(fs.readFileSync(path.resolve(required(o,'file')),'utf8'));if(!csv.length)throw Error('CSV has no findings');
 const mapping=o.mapping?JSON.parse(fs.readFileSync(path.resolve(o.mapping),'utf8')):{};
 const defaults={source_id:['Finding ID','Issue ID','ID'],name:['Finding Title','Issue Name','Name'],severity:['Severity','Rating'],condition:['Condition','Description'],cause:['Root Cause','Cause'],recommendation:['Recommendation','Action Plan']};
 for(const [k,v] of Object.entries(mapping))if(!(k in defaults)||typeof v!=='string'||!v.trim())throw Error('Mapping must map supported field names to a column heading');
 const seen=new Set();let inserted=0,skipped=0;
 for(const [i,source] of csv.entries()){
 const val=k=>pick(source,...(mapping[k]?[mapping[k]]:defaults[k])).trim();
 const raw=Object.fromEntries(Object.keys(defaults).map(k=>[k,val(k)]));
 for(const k of ['source_id','name','severity','condition'])if(!raw[k])throw Error(`Row ${i+2}: missing ${k}; supply an explicit column mapping`);
 raw.severity=choice(raw.severity.toLowerCase(),['low','medium','high','critical']);
 const id=`auditboard:${e.id}:${raw.source_id}`;if(seen.has(id))throw Error(`Duplicate source ID at row ${i+2}`);seen.add(id);
 const [old]=await db.query('select * from findings where source_id=$1',[id]);
 if(old){if(JSON.stringify(old.source_snapshot)!==JSON.stringify(JSON.parse(JSON.stringify(source,Object.keys(source).sort())))){
 // JSON key order differs between database engines. Compare key/value content.
 if(Object.keys(old.source_snapshot).length!==Object.keys(source).length||Object.keys(source).some(k=>old.source_snapshot[k]!==source[k]))throw Error(`Source ${raw.source_id} changed; reconcile explicitly before reimport. Local findings were not overwritten.`);
 }skipped++;continue;}
 await db.query('insert into findings(engagement_id,name,severity,condition,cause,recommendation,source_id,source_snapshot) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb)',[e.id,raw.name,raw.severity,raw.condition,raw.cause,raw.recommendation,id,JSON.stringify(source)]);inserted++;
 }
 row=e;result={inserted,skipped,dry_run:!!o['dry-run'],note:'Findings only. Source status and unmapped columns retained in snapshot. No approval, verification or attachment contents inferred.'};
 }
 await audit(db,actor,cmd,row,result||row);
 await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return result||row;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):output(result));}
 catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}
}
