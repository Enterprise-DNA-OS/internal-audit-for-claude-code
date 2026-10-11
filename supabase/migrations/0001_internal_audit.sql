create table engagements (
 id uuid primary key default gen_random_uuid(), name text not null unique check(length(trim(name))>0),
 entity text not null, owner text not null, risk integer not null default 3 check(risk between 1 and 5),
 objective text not null default '', scope text not null default '', due date not null,
 status text not null default 'planned' check(status in ('planned','fieldwork','reporting','closed')),
 conclusion text not null default '', approved_by text, approved_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table workpapers (
 id uuid primary key default gen_random_uuid(), engagement_id uuid not null references engagements(id),
 name text not null, criteria text not null default '', procedure text not null default '',
 preparer text not null, due date not null, result text not null default 'untested' check(result in ('untested','pass','fail')),
 evidence text not null default '', conclusion text not null default '', reviewer text, reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(engagement_id,name),
 check(reviewer is null or lower(trim(reviewer))<>lower(trim(preparer))),
 check((reviewer is null)=(reviewed_at is null)),
 check(reviewer is null or (result<>'untested' and length(trim(evidence))>0 and length(trim(conclusion))>0))
);
create table requests (
 id uuid primary key default gen_random_uuid(), engagement_id uuid not null references engagements(id),
 name text not null, owner text not null, due date not null, received_at timestamptz, evidence text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(received_at is null or length(trim(evidence))>0)
);
create table findings (
 id uuid primary key default gen_random_uuid(), engagement_id uuid not null references engagements(id),
 name text not null, severity text not null check(severity in ('low','medium','high','critical')),
 condition text not null, cause text not null default '', recommendation text not null default '',
 source_id text unique, source_snapshot jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table actions (
 id uuid primary key default gen_random_uuid(), finding_id uuid not null references findings(id),
 name text not null, owner text not null, due date not null,
 state text not null default 'open' check(state in ('open','implemented','verified')),
 implementation_evidence text not null default '', verification_evidence text not null default '', verified_by text,
 verified_at timestamptz, delay_reason text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(state='open' or length(trim(implementation_evidence))>0),
 check(state<>'verified' or (length(trim(verification_evidence))>0 and verified_by is not null and verified_at is not null and lower(trim(verified_by))<>lower(trim(owner))))
);
create table notes (
 id uuid primary key default gen_random_uuid(), engagement_id uuid not null references engagements(id),
 actor text not null, body text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table history (
 id uuid primary key default gen_random_uuid(), actor text not null, operation text not null,
 record_id uuid, detail jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare n text; begin foreach n in array array['engagements','workpapers','requests','findings','actions','notes','history'] loop
 execute format('create trigger touch_updated before update on %I for each row execute function touch_updated()',n);
 execute format('alter table %I enable row level security',n);
 execute format('revoke all on %I from public',n);
end loop; end $$;
create index on workpapers(engagement_id);
create index on requests(engagement_id);
create index on findings(engagement_id);
create index on actions(finding_id);
create view audit_plan as select e.id,e.name,e.entity,e.owner,e.risk,e.due,e.status,
 (select count(*) from workpapers w where w.engagement_id=e.id) as workpapers,
 (select count(*) from workpapers w where w.engagement_id=e.id and w.reviewed_at is null) as awaiting_review,
 (select count(*) from requests r where r.engagement_id=e.id and r.received_at is null) as outstanding_requests,
 (select count(*) from findings f join actions a on a.finding_id=f.id where f.engagement_id=e.id and a.state<>'verified') as open_actions
 from engagements e;
create view action_follow_up as select a.id,e.name as engagement,f.name as finding,f.severity,a.name,a.owner,a.due,a.state,
 greatest(current_date-a.due,0) as days_overdue,a.delay_reason from actions a join findings f on f.id=a.finding_id join engagements e on e.id=f.engagement_id where a.state<>'verified';
create view review_queue as select w.id,e.name as engagement,w.name,w.preparer,w.due,w.result,
 case when w.result='untested' then 'Test not performed' when w.evidence='' then 'Evidence missing' when w.conclusion='' then 'Conclusion missing' else 'Independent review needed' end as gap
 from workpapers w join engagements e on e.id=w.engagement_id where w.reviewed_at is null;
create view evidence_chase as select r.id,e.name as engagement,r.name,r.owner,r.due,greatest(current_date-r.due,0) as days_overdue
 from requests r join engagements e on e.id=r.engagement_id where r.received_at is null;
create view compliance_gaps as
 select e.id,'IIA 13.3'::text as rule,e.name as record,'Document engagement objectives and scope'::text as gap from engagements e where trim(e.objective)='' or trim(e.scope)=''
 union all select w.id,'IIA 14.6',w.name,'Workpaper evidence, conclusion or review outstanding' from workpapers w where w.result='untested' or trim(w.evidence)='' or trim(w.conclusion)='' or w.reviewer is null
 union all select a.id,'IIA 15.2',a.name,'Overdue action needs management explanation' from actions a where a.due<current_date and a.state<>'verified' and trim(a.delay_reason)=''
 union all select a.id,'IIA 15.2',a.name,'Implementation claimed; auditor verification outstanding' from actions a where a.state='implemented';
revoke all on audit_plan,action_follow_up,review_queue,evidence_chase,compliance_gaps from public;
