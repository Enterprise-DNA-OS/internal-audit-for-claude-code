insert into engagements(id,name,entity,owner,risk,objective,scope,due,status) values
('10000000-0000-4000-8000-000000000001','Supplier access review','Harbour Assurance Demo','Mere',5,'Assess supplier access removal','Supplier accounts created in the last quarter',current_date+14,'fieldwork'),
('10000000-0000-4000-8000-000000000002','Stock count assurance','Harbour Assurance Demo','Tane',4,'','',current_date-7,'planned'),
('10000000-0000-4000-8000-000000000003','Travel expense review','Harbour Assurance Demo','Aroha',2,'Assess approval evidence','Domestic travel claims',current_date+30,'reporting') on conflict do nothing;
insert into workpapers(id,engagement_id,name,criteria,procedure,preparer,due,result,evidence,conclusion) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Leaver access test','Access removed within local policy window','Compare ten leavers with access register','Mere',current_date-4,'fail','demo://leaver-sample','Two sampled accounts remained active'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Privileged account test','Privileged access approved','Inspect approval records','Mere',current_date+2,'untested','',''),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','Expense approval test','Travel policy approvals','Inspect five claims','Aroha',current_date-2,'pass','demo://travel-sample','All five approvals evidenced') on conflict do nothing;
insert into requests(id,engagement_id,name,owner,due) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Supplier leaver register','Wiremu',current_date-8),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Stock adjustment approvals','Leah',current_date+3) on conflict do nothing;
insert into findings(id,engagement_id,name,severity,condition,cause,recommendation) values
('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Supplier accounts remain active','high','Two accounts remained active after contract end','No reconciled supplier leaver list','Reconcile active accounts to current supplier list'),
('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Unapproved stock adjustments','medium','Approval evidence not available for three adjustments','','Record approval before posting') on conflict do nothing;
insert into actions(id,finding_id,name,owner,due,state,implementation_evidence) values
('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Remove expired supplier accounts','Wiremu',current_date-12,'open',''),
('50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','Reconcile supplier access monthly','Wiremu',current_date-3,'implemented','demo://reconciliation-claim'),
('50000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000002','Introduce approval checklist','Leah',current_date+7,'open','') on conflict do nothing;

insert into engagements(id,name,entity,owner,risk,objective,scope,due,status,updated_at) values('10000000-0000-4000-8000-000000000004','Dormant branch review','Harbour Assurance Demo','Tane',3,'Assess branch reconciliations','Last quarter',current_date+45,'planned',now()-interval '45 days') on conflict do nothing;
