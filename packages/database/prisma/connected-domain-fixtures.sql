-- EXECUTED ONLY by connected-domain-disposable.ts after all authorization gates.
-- No BEGIN/COMMIT here: the runner always rolls back, including grants and policies.
-- Operator workflow (NOT RUN): provision a run-owned EMPTY loopback database and
-- precreate two restricted browser roles plus a restricted non-owner fixture role.
-- Do not use hosted roles. Login owner must own the 45 application tables and be
-- allowed to SET ROLE to those three roles; they must have no other memberships.
-- Fresh: operator deploys all eight reviewed migrations to that empty database.
-- Upgrade: operator deploys only the seven historical migrations first, inserts
-- synthetic baseline rows, then deploys 202610060001_connected_domains explicitly.
-- Never reset, DROP SCHEMA, push, seed or automatically deploy from this harness.
-- Executable upgrade preservation is provided separately by connected-domain-upgrade.ts.
-- Its prepare phase requires seven migrations and 29 EMPTY tables, intentionally
-- commits synthetic rows, and persists only local aggregate SHA-256/counts.
-- Its read-only compare phase requires all eight migrations / 45 tables and checks
-- identical old-column digests plus NULL read_at and FIVE redemption extensions.
-- No row contents are exported. Both phases require all disposable gates; prepare
-- additionally requires --confirm-preserve-synthetic-baseline. Deployment remains
-- a separate manual operator action. No real SQL or upgrade run is claimed here.
--
-- Command templates; angle-bracket values are operator-supplied, NEVER defaults:
-- npm run test:connected-domain -w @rhc/database
-- npm run typecheck:connected-domain -w @rhc/database
-- npm run db:connected-domain:manifest -w @rhc/database
-- npm run db:connected-domain:verify -w @rhc/database -- --authorize-read-only --target-host <host> --target-port <port> --target-database <database> --target-role <login>
--   Requires only CONNECTED_DOMAIN_READONLY_URL in the process environment.
-- npm run db:connected-domain:disposable -w @rhc/database -- --authorize-disposable-writes --confirm-run-owned-initially-empty --target-host 127.0.0.1 --target-port <port> --target-database <run_owned_database> --target-role <owner_login> --confirm-disposable 127.0.0.1:<port>/<run_owned_database> --fixture-role <fixture> --browser-role <browser_a> --browser-role <browser_b>
--   Requires only CONNECTED_DOMAIN_DISPOSABLE_URL in the process environment.
-- Neither tool reads .env, DATABASE_URL or DIRECT_URL. Never put passwords on CLI.
-- Both require a previously generated Prisma 5.22 client; generation is an
-- operator-local offline preparation step, not performed by either database tool.
-- Historical deployment must use an OPERATOR-STAGED schema+migrations directory
-- containing only the seven byte-identical historical migrations, NOT a renamed
-- migration directory in this checkout. Operator command in that isolated staging:
-- prisma migrate deploy --schema <operator_staged_historical_schema.prisma>
-- After synthetic baseline capture, add the byte-identical eighth migration and
-- final schema to that same staging directory and repeat the deploy command.
-- Fresh workflow: stage all eight from the outset in a second empty database.
-- Operator deploy credentials/configuration are separate from these dedicated URLs.
-- No database-creation, role-creation, password or inferred target command is given.

CREATE FUNCTION pg_temp.cd_uuid(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT md5('connected-domain-isolated-fixture-' || n::text)::uuid
$$;
CREATE FUNCTION pg_temp.cd_assert(ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'fixture assertion failed' USING ERRCODE='P0001'; END IF;
END
$$;
CREATE FUNCTION pg_temp.cd_expect(command text, expected_state text, expected_constraint text DEFAULT NULL) RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual_constraint text;
BEGIN
  BEGIN
    EXECUTE command;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS actual_constraint = CONSTRAINT_NAME;
    IF SQLSTATE <> expected_state OR (expected_constraint IS NOT NULL AND actual_constraint <> expected_constraint) THEN
      RAISE EXCEPTION 'wrong fixture error class' USING ERRCODE='P0001';
    END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'invalid fixture unexpectedly succeeded' USING ERRCODE='P0001';
END
$$;
-- Clones known synthetic rows only; never enumerate or print customer data.
CREATE FUNCTION pg_temp.cd_clone(tab text, source_id integer, overrides jsonb) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('INSERT INTO public.%I SELECT (jsonb_populate_record(NULL::public.%I, to_jsonb(t) || $2)).* FROM public.%I t WHERE id=$1',tab,tab,tab)
    USING pg_temp.cd_uuid(source_id), jsonb_build_object('id',md5(random()::text)::uuid)||overrides;
END
$$;

INSERT INTO public.users(id,email,updated_at) VALUES
 (pg_temp.cd_uuid(1),'connected-customer@example.invalid','2020-01-01'),
 (pg_temp.cd_uuid(2),'connected-reviewer@example.invalid','2020-01-01'),
 (pg_temp.cd_uuid(3),'connected-other@example.invalid','2020-01-01');
INSERT INTO public.user_profiles(id,user_id,email,rhc_id,rhc_id_issued_at,updated_at) VALUES
 (pg_temp.cd_uuid(4),pg_temp.cd_uuid(1),'connected-customer@example.invalid','CD-FIXTURE-ISSUED','2020-01-01','2020-01-01');
INSERT INTO public.companies(id,company_code,legal_name,display_name,updated_at) VALUES
 (pg_temp.cd_uuid(10),'CD-FIXTURE-A','Synthetic A','Synthetic A','2020-01-01'),
 (pg_temp.cd_uuid(11),'CD-FIXTURE-B','Synthetic B','Synthetic B','2020-01-01');
INSERT INTO public.projects(id,company_id,project_code,project_name,updated_at) VALUES
 (pg_temp.cd_uuid(12),pg_temp.cd_uuid(10),'CD-FIXTURE-P','Synthetic project','2020-01-01');
INSERT INTO public.properties(id,project_id,property_code,asset_type,updated_at) VALUES
 (pg_temp.cd_uuid(13),pg_temp.cd_uuid(12),'CD-FIXTURE-U','RESIDENTIAL','2020-01-01'),
 (pg_temp.cd_uuid(14),pg_temp.cd_uuid(12),'CD-FIXTURE-V','RESIDENTIAL','2020-01-01');
INSERT INTO public.business_services(id,company_id,service_code,service_name,service_type,updated_at) VALUES
 (pg_temp.cd_uuid(15),pg_temp.cd_uuid(10),'CD-FIXTURE-S','Synthetic service','SYNTHETIC','2020-01-01');
INSERT INTO public.reservations(id,reservation_number,customer_id,property_id,expires_at,created_at,updated_at) VALUES
 (pg_temp.cd_uuid(16),'CD-FIXTURE-R',pg_temp.cd_uuid(1),pg_temp.cd_uuid(13),'2099-01-01','2020-01-01','2020-01-01');
INSERT INTO public.reservation_events(id,reservation_id,event_type) VALUES (pg_temp.cd_uuid(17),pg_temp.cd_uuid(16),'CREATED');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('reservations',16,'{"reservation_number":"CD-FIXTURE-DUP"}')$q$,'23505','reservations_one_active_property_key');
SELECT pg_temp.cd_expect($q$DELETE FROM public.reservations WHERE id=pg_temp.cd_uuid(16)$q$,'23503','reservation_events_reservation_id_fkey');

INSERT INTO public.documents(id,customer_id,property_id,title,category,created_at,updated_at) VALUES
 (pg_temp.cd_uuid(20),pg_temp.cd_uuid(1),pg_temp.cd_uuid(13),'Synthetic document','TEST','2020-01-01','2020-01-01');
INSERT INTO public.document_versions(id,document_id,version_number,storage_bucket,storage_object,checksum_sha256,size_bytes,mime_type,uploaded_by_id,idempotency_key,created_at) VALUES
 (pg_temp.cd_uuid(21),pg_temp.cd_uuid(20),1,'fixture','fixture/v1.pdf',repeat('a',64),100,'application/pdf',pg_temp.cd_uuid(1),'CD-V1','2020-01-02'),
 (pg_temp.cd_uuid(22),pg_temp.cd_uuid(20),2,'fixture','fixture/v2.pdf',repeat('b',64),200,'application/pdf',pg_temp.cd_uuid(1),'CD-V2','2020-01-03');
INSERT INTO public.document_reviews(id,document_version_id,reviewer_user_id,decision,review_reference,idempotency_key,decided_at) VALUES
 (pg_temp.cd_uuid(23),pg_temp.cd_uuid(21),pg_temp.cd_uuid(2),'APPROVED','CD-REVIEW','CD-REVIEW','2020-01-04');
SELECT pg_temp.cd_assert((SELECT document_version_id=pg_temp.cd_uuid(21) FROM public.document_reviews WHERE id=pg_temp.cd_uuid(23)));
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('document_versions',21,'{"size_bytes":0}')$q$,'23514','document_versions_positive_check');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('document_versions',21,'{"checksum_sha256":"not-a-hash"}')$q$,'23514','document_versions_checksum_check');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('document_versions',21,'{"storage_object":"../escape"}')$q$,'23514','document_versions_storage_check');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('document_versions',21,'{}')$q$,'23505');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('document_reviews',23,jsonb_build_object('reviewer_user_id',pg_temp.cd_uuid(1)))$q$,'23514');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('documents',20,'{"created_at":"2099-01-01","updated_at":"2099-01-01"}')$q$,'23514');

INSERT INTO public.identity_review_requests(id,customer_id,requested_by_id,evidence_version_id,reason,idempotency_key,created_at,updated_at) VALUES
 (pg_temp.cd_uuid(24),pg_temp.cd_uuid(1),pg_temp.cd_uuid(1),pg_temp.cd_uuid(21),'Synthetic verification','CD-IDENTITY','2020-01-04','2020-01-04');
UPDATE public.identity_review_requests SET status='APPROVED',reviewer_user_id=pg_temp.cd_uuid(2),review_reference='CD-ID-REVIEW',decided_at='2020-01-05',updated_at='2020-01-05' WHERE id=pg_temp.cd_uuid(24);
SELECT pg_temp.cd_expect($q$UPDATE public.identity_review_requests SET reason='changed' WHERE id=pg_temp.cd_uuid(24)$q$,'23514');
SELECT pg_temp.cd_assert((SELECT verification_status='UNVERIFIED' AND first_name IS NULL FROM public.user_profiles WHERE id=pg_temp.cd_uuid(4)));

INSERT INTO public.payment_records(id,customer_id,property_id,submitted_by_id,reservation_id,reference,amount,description,evidence_version_id,idempotency_key,submitted_at) VALUES
 (pg_temp.cd_uuid(30),pg_temp.cd_uuid(1),pg_temp.cd_uuid(13),pg_temp.cd_uuid(1),pg_temp.cd_uuid(16),'CD-PAYMENT',50,'Synthetic payment',pg_temp.cd_uuid(21),'CD-PAYMENT','2020-01-04'),
 (pg_temp.cd_uuid(31),pg_temp.cd_uuid(1),pg_temp.cd_uuid(13),pg_temp.cd_uuid(1),NULL,'CD-PAYMENT-2',50,'Synthetic payment',NULL,'CD-PAYMENT-2','2020-01-04');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('payment_records',30,'{"amount":0}')$q$,'23514','payment_records_amount_check');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('payment_records',30,'{"amount":"NaN"}')$q$,'23514','payment_records_amount_check');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('payment_records',30,'{"currency":"USD"}')$q$,'23514','payment_records_amount_check');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('payment_records',30,'{"paid_at":"2020-01-05"}')$q$,'23514','payment_records_paid_at_check');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('payment_records',31,jsonb_build_object('reservation_id',pg_temp.cd_uuid(16),'customer_id',pg_temp.cd_uuid(3),'idempotency_key','CD-WRONG-CUSTOMER'))$q$,'23503','payment_records_reservation_scope_fkey');
SELECT pg_temp.cd_expect($q$UPDATE public.reservations SET customer_id=pg_temp.cd_uuid(3) WHERE id=pg_temp.cd_uuid(16)$q$,'23503','payment_records_reservation_scope_fkey');
INSERT INTO public.payment_record_events(id,payment_record_id,event_type,actor_user_id,review_reference,idempotency_key,created_at) VALUES
 (pg_temp.cd_uuid(32),pg_temp.cd_uuid(30),'VERIFIED',pg_temp.cd_uuid(2),'CD-VERIFY','CD-VERIFY','2020-01-05');
SELECT pg_temp.cd_expect($q$INSERT INTO public.payment_record_events(id,payment_record_id,event_type,actor_user_id,reversal_of_id,review_reference,idempotency_key,created_at) VALUES(pg_temp.cd_uuid(33),pg_temp.cd_uuid(31),'REVERSED',pg_temp.cd_uuid(2),pg_temp.cd_uuid(32),'CD-REVERSE','CD-REVERSE','2020-01-06')$q$,'23514');
INSERT INTO public.payment_record_events(id,payment_record_id,event_type,actor_user_id,reversal_of_id,review_reference,idempotency_key,created_at) VALUES
 (pg_temp.cd_uuid(33),pg_temp.cd_uuid(30),'REVERSED',pg_temp.cd_uuid(2),pg_temp.cd_uuid(32),'CD-REVERSE','CD-REVERSE','2020-01-06');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('payment_record_events',33,'{"idempotency_key":"CD-REVERSE-TWICE"}')$q$,'23505','payment_record_events_reversal_of_id_key');

INSERT INTO public.certificates(id,customer_id,reference,certificate_type,issuer_company_id,source_document_version_id,created_by_id,idempotency_key,created_at) VALUES
 (pg_temp.cd_uuid(40),pg_temp.cd_uuid(1),'CD-CERT','TEST',pg_temp.cd_uuid(10),pg_temp.cd_uuid(21),pg_temp.cd_uuid(2),'CD-CERT','2020-01-04');
INSERT INTO public.certificate_events(id,certificate_id,event_type,actor_user_id,review_reference,idempotency_key,created_at) VALUES
 (pg_temp.cd_uuid(41),pg_temp.cd_uuid(40),'ISSUED',pg_temp.cd_uuid(2),'CD-ISSUE','CD-ISSUE','2020-01-05');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('certificates',40,jsonb_build_object('source_property_id',pg_temp.cd_uuid(13)))$q$,'23514','certificates_source_check');
INSERT INTO public.verification_references(id,token_hash,user_profile_id,created_at) VALUES
 (pg_temp.cd_uuid(42),repeat('c',64),pg_temp.cd_uuid(4),'2020-01-06');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('verification_references',42,'{"user_profile_id":null}')$q$,'23514','verification_references_target_check');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('verification_references',42,jsonb_build_object('certificate_id',pg_temp.cd_uuid(40)))$q$,'23514','verification_references_target_check');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('verification_references',42,'{"enabled":true}')$q$,'23514','verification_references_inactive_check');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('verification_references',42,'{"expires_at":"2019-01-01"}')$q$,'23514','verification_references_dates_check');
INSERT INTO public.user_profiles(id,user_id,email,updated_at) VALUES
 (pg_temp.cd_uuid(5),pg_temp.cd_uuid(3),'connected-other@example.invalid','2020-01-01');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('verification_references',42,jsonb_build_object('user_profile_id',pg_temp.cd_uuid(5)))$q$,'23514');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('certificates',40,jsonb_build_object('issuer_company_id',pg_temp.cd_uuid(11),'supersedes_id',pg_temp.cd_uuid(40),'reference','CD-CROSS-ISSUER','idempotency_key','CD-CROSS-ISSUER'))$q$,'23514');

INSERT INTO public.service_requests(id,customer_id,requested_by_id,company_id,service_id,property_id,reference,title,idempotency_key,created_at,updated_at) VALUES
 (pg_temp.cd_uuid(50),pg_temp.cd_uuid(1),pg_temp.cd_uuid(1),pg_temp.cd_uuid(10),pg_temp.cd_uuid(15),pg_temp.cd_uuid(13),'CD-SERVICE','Synthetic service','CD-SERVICE','2020-01-01','2020-01-01');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('service_requests',50,jsonb_build_object('company_id',pg_temp.cd_uuid(11),'reference','CD-WRONG-SCOPE','idempotency_key','CD-WRONG-SCOPE'))$q$,'23503','service_requests_service_id_company_id_fkey');
INSERT INTO public.service_request_events(id,service_request_id,actor_user_id,event_type,event_number,status,idempotency_key,created_at) VALUES
 (pg_temp.cd_uuid(51),pg_temp.cd_uuid(50),pg_temp.cd_uuid(2),'CREATED',1,'PENDING','CD-SERVICE-CREATED','2020-01-01');
UPDATE public.service_requests SET assignee_user_id=pg_temp.cd_uuid(2),updated_at='2020-01-02' WHERE id=pg_temp.cd_uuid(50);
INSERT INTO public.service_request_events(id,service_request_id,actor_user_id,event_type,event_number,next_assignee_user_id,status,idempotency_key,created_at) VALUES
 (pg_temp.cd_uuid(52),pg_temp.cd_uuid(50),pg_temp.cd_uuid(2),'ASSIGNMENT_CHANGED',2,pg_temp.cd_uuid(2),'PENDING','CD-SERVICE-ASSIGN','2020-01-02');
UPDATE public.service_requests SET assignee_user_id=NULL,updated_at='2020-01-03' WHERE id=pg_temp.cd_uuid(50);
INSERT INTO public.service_request_events(id,service_request_id,actor_user_id,event_type,event_number,previous_assignee_user_id,status,idempotency_key,created_at) VALUES
 (pg_temp.cd_uuid(53),pg_temp.cd_uuid(50),pg_temp.cd_uuid(2),'ASSIGNMENT_CHANGED',3,pg_temp.cd_uuid(2),'PENDING','CD-SERVICE-UNASSIGN','2020-01-03');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('service_request_events',53,'{"event_number":5,"idempotency_key":"CD-SKIPPED"}')$q$,'23514');
INSERT INTO public.saved_properties(id,customer_id,property_id) VALUES(pg_temp.cd_uuid(54),pg_temp.cd_uuid(1),pg_temp.cd_uuid(13));
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('saved_properties',54,'{}')$q$,'23505','saved_properties_customer_id_property_id_key');
INSERT INTO public.project_milestones(id,project_id,milestone_code,title,created_at,updated_at) VALUES
 (pg_temp.cd_uuid(55),pg_temp.cd_uuid(12),'CD-MILESTONE','Synthetic milestone','2020-01-01','2020-01-01');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('project_milestones',55,'{"publication_status":"PUBLISHED"}')$q$,'23514','project_milestones_publication_check');
INSERT INTO public.turnover_cases(id,customer_id,property_id,case_number,status,created_at,updated_at) VALUES
 (pg_temp.cd_uuid(56),pg_temp.cd_uuid(1),pg_temp.cd_uuid(13),'CD-TURNOVER-1','DRAFT','2020-01-01','2020-01-01'),
 (pg_temp.cd_uuid(57),pg_temp.cd_uuid(1),pg_temp.cd_uuid(13),'CD-TURNOVER-2','IN_PROGRESS','2020-01-01','2020-01-01');
INSERT INTO public.turnover_checklist_items(id,turnover_case_id,item_code,label,created_at,updated_at) VALUES
 (pg_temp.cd_uuid(58),pg_temp.cd_uuid(56),'CD-ITEM','Synthetic item','2020-01-01','2020-01-01');
UPDATE public.turnover_checklist_items SET evidence_version_id=pg_temp.cd_uuid(22),updated_at='2020-01-04' WHERE id=pg_temp.cd_uuid(58);
SELECT pg_temp.cd_expect($q$UPDATE public.turnover_checklist_items SET evidence_version_id=NULL WHERE id=pg_temp.cd_uuid(58)$q$,'23514');
UPDATE public.turnover_checklist_items SET completed_by_id=pg_temp.cd_uuid(2),completed_at='2020-01-05',updated_at='2020-01-05' WHERE id=pg_temp.cd_uuid(58);
SELECT pg_temp.cd_expect($q$UPDATE public.turnover_checklist_items SET label='changed' WHERE id=pg_temp.cd_uuid(58)$q$,'23514');

INSERT INTO public.notifications(id,user_id,channel,subject,body,created_at) VALUES
 (pg_temp.cd_uuid(60),pg_temp.cd_uuid(1),'TEST','Synthetic notice','Synthetic content','2020-01-01');
SELECT pg_temp.cd_assert((SELECT read_at IS NULL AND sent_at IS NULL AND status='QUEUED' FROM public.notifications WHERE id=pg_temp.cd_uuid(60)));
-- A changed non-NULL read_at is a request to stamp DB UTC, not a supplied date.
DO $$
DECLARE before_stamp timestamp(3); stamped timestamp(3); original_created timestamp(3);
BEGIN
 before_stamp := (clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3);
 SELECT created_at INTO original_created FROM public.notifications WHERE id=pg_temp.cd_uuid(60);
 UPDATE public.notifications SET read_at='2019-01-01' WHERE id=pg_temp.cd_uuid(60);
 SELECT read_at INTO stamped FROM public.notifications WHERE id=pg_temp.cd_uuid(60);
 PERFORM pg_temp.cd_assert(stamped >= before_stamp AND stamped <= (clock_timestamp() AT TIME ZONE 'UTC')::timestamp(3));
 UPDATE public.notifications SET read_at=read_at WHERE id=pg_temp.cd_uuid(60);
 PERFORM pg_temp.cd_assert((SELECT read_at=stamped AND created_at=original_created AND sent_at IS NULL FROM public.notifications WHERE id=pg_temp.cd_uuid(60)));
 UPDATE public.notifications SET read_at=NULL WHERE id=pg_temp.cd_uuid(60);
 PERFORM pg_temp.cd_assert((SELECT read_at IS NULL FROM public.notifications WHERE id=pg_temp.cd_uuid(60)));
END
$$;
INSERT INTO public.rewards_accounts(id,customer_id,company_id,updated_at) VALUES
 (pg_temp.cd_uuid(61),pg_temp.cd_uuid(1),pg_temp.cd_uuid(10),'2020-01-01');
INSERT INTO public.rewards_redemptions(id,customer_id,rewards_account_id,amount,updated_at) VALUES
 (pg_temp.cd_uuid(62),pg_temp.cd_uuid(1),pg_temp.cd_uuid(61),10,'2020-01-01');
SELECT pg_temp.cd_assert((SELECT benefit_id IS NULL AND benefit_company_id IS NULL AND original_debit_id IS NULL AND accepted_points_cost IS NULL AND accepted_terms_snapshot IS NULL FROM public.rewards_redemptions WHERE id=pg_temp.cd_uuid(62)));
INSERT INTO public.rewards_benefits(id,company_id,benefit_code,title,created_at,updated_at) VALUES
 (pg_temp.cd_uuid(63),pg_temp.cd_uuid(10),'CD-BENEFIT','Synthetic inactive benefit','2020-01-01','2020-01-01');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('rewards_benefits',63,'{"active":true}')$q$,'23514','rewards_benefits_inactive_check');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('rewards_benefits',63,'{"points_cost":"NaN"}')$q$,'23514','rewards_benefits_cost_check');
INSERT INTO public.rewards_transactions(id,rewards_account_id,customer_id,transaction_number,transaction_type,amount,reason,status) VALUES
 (pg_temp.cd_uuid(64),pg_temp.cd_uuid(61),pg_temp.cd_uuid(1),'CD-DEBIT','REDEEM',-10,'Synthetic debit','POSTED');
INSERT INTO public.rewards_redemptions(id,customer_id,rewards_account_id,amount,benefit_id,accepted_points_cost,accepted_terms_snapshot,original_debit_id,updated_at) VALUES
 (pg_temp.cd_uuid(65),pg_temp.cd_uuid(1),pg_temp.cd_uuid(61),10,pg_temp.cd_uuid(63),10,'Synthetic terms',pg_temp.cd_uuid(64),'2020-01-01');
INSERT INTO public.rewards_accounts(id,customer_id,company_id,updated_at) VALUES
 (pg_temp.cd_uuid(69),pg_temp.cd_uuid(3),pg_temp.cd_uuid(10),'2020-01-01');
INSERT INTO public.rewards_transactions(id,rewards_account_id,customer_id,transaction_number,transaction_type,amount,reason,status) VALUES
 (pg_temp.cd_uuid(67),pg_temp.cd_uuid(61),pg_temp.cd_uuid(1),'CD-WRONG-TYPE','EARN',10,'Synthetic credit','POSTED'),
 (pg_temp.cd_uuid(68),pg_temp.cd_uuid(69),pg_temp.cd_uuid(3),'CD-OTHER-ACCOUNT','REDEEM',-10,'Synthetic other debit','POSTED');
INSERT INTO public.rewards_benefits(id,company_id,benefit_code,title,created_at,updated_at) VALUES
 (pg_temp.cd_uuid(70),pg_temp.cd_uuid(11),'CD-OTHER-BENEFIT','Synthetic other scope','2020-01-01','2020-01-01');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('rewards_redemptions',65,jsonb_build_object('original_debit_id',pg_temp.cd_uuid(67)))$q$,'23514');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('rewards_redemptions',65,jsonb_build_object('original_debit_id',pg_temp.cd_uuid(68)))$q$,'23514');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('rewards_redemptions',65,jsonb_build_object('benefit_id',pg_temp.cd_uuid(70)))$q$,'23514');
SELECT pg_temp.cd_assert((SELECT benefit_company_id=pg_temp.cd_uuid(10) FROM public.rewards_redemptions WHERE id=pg_temp.cd_uuid(65)));
SELECT pg_temp.cd_expect($q$UPDATE public.rewards_accounts SET company_id=NULL WHERE id=pg_temp.cd_uuid(61)$q$,'23503','rewards_redemptions_scoped_account_fkey');
SELECT pg_temp.cd_expect($q$UPDATE public.rewards_accounts SET company_id=pg_temp.cd_uuid(11) WHERE id=pg_temp.cd_uuid(61)$q$,'23503','rewards_redemptions_scoped_account_fkey');
SELECT pg_temp.cd_expect($q$UPDATE public.rewards_benefits SET company_id=pg_temp.cd_uuid(11) WHERE id=pg_temp.cd_uuid(63)$q$,'23514');
SELECT pg_temp.cd_expect($q$UPDATE public.rewards_redemptions SET benefit_company_id=NULL WHERE id=pg_temp.cd_uuid(65)$q$,'23514');
-- Unlinked accounts and global benefits retain their historical flexibility.
UPDATE public.rewards_accounts SET company_id=pg_temp.cd_uuid(11) WHERE id=pg_temp.cd_uuid(69);
INSERT INTO public.rewards_benefits(id,benefit_code,title) VALUES(pg_temp.cd_uuid(71),'CD-GLOBAL','Synthetic global inactive benefit');
INSERT INTO public.rewards_redemptions(id,customer_id,rewards_account_id,amount,benefit_id,accepted_points_cost,accepted_terms_snapshot,updated_at) VALUES(pg_temp.cd_uuid(72),pg_temp.cd_uuid(3),pg_temp.cd_uuid(69),5,pg_temp.cd_uuid(71),5,'Synthetic global terms','2020-01-01');
UPDATE public.rewards_accounts SET company_id=NULL WHERE id=pg_temp.cd_uuid(69);
SELECT pg_temp.cd_assert((SELECT benefit_company_id IS NULL FROM public.rewards_redemptions WHERE id=pg_temp.cd_uuid(72)));
SELECT pg_temp.cd_expect($q$UPDATE public.rewards_transactions SET amount=-11 WHERE id=pg_temp.cd_uuid(64)$q$,'23514');
SELECT pg_temp.cd_expect($q$UPDATE public.rewards_redemptions SET original_debit_id=NULL WHERE id=pg_temp.cd_uuid(65)$q$,'23514');
SELECT pg_temp.cd_expect($q$SELECT pg_temp.cd_clone('rewards_redemptions',65,'{"accepted_points_cost":11,"amount":11}')$q$,'23514');
INSERT INTO public.rewards_transactions(id,rewards_account_id,customer_id,transaction_number,transaction_type,amount,reason,status,reversal_of_id) VALUES
 (pg_temp.cd_uuid(66),pg_temp.cd_uuid(61),pg_temp.cd_uuid(1),'CD-LEDGER-REVERSAL','REVERSAL',10,'Synthetic reversal','POSTED',pg_temp.cd_uuid(64));
UPDATE public.rewards_transactions SET status='REVERSED' WHERE id=pg_temp.cd_uuid(64);
SELECT pg_temp.cd_assert((SELECT reversal_of_id=pg_temp.cd_uuid(64) FROM public.rewards_transactions WHERE id=pg_temp.cd_uuid(66)));

SELECT pg_temp.cd_expect($q$UPDATE public.project_milestones SET milestone_code='CD-REPARENT' WHERE id=pg_temp.cd_uuid(55)$q$,'23514');
-- All seven new mutable headers ignore a client-supplied updated_at clock.
DO $$
DECLARE tab text; ok boolean;
BEGIN
 FOREACH tab IN ARRAY ARRAY['documents','identity_review_requests','service_requests','project_milestones','turnover_cases','turnover_checklist_items','rewards_benefits'] LOOP
   EXECUTE format('SELECT bool_and(updated_at >= (CURRENT_TIMESTAMP AT TIME ZONE ''UTC'')::timestamp(3)) FROM public.%I',tab) INTO ok;
   PERFORM pg_temp.cd_assert(ok);
 END LOOP;
END
$$;
UPDATE public.documents SET updated_at='2099-01-01' WHERE id=pg_temp.cd_uuid(20);
SELECT pg_temp.cd_assert((SELECT updated_at<'2099-01-01' AND created_at='2020-01-01' FROM public.documents WHERE id=pg_temp.cd_uuid(20)));
SET LOCAL TIME ZONE 'Pacific/Auckland';
INSERT INTO public.documents(id,customer_id,title,category) VALUES(pg_temp.cd_uuid(95),pg_temp.cd_uuid(1),'Synthetic UTC default','TEST');
SELECT pg_temp.cd_assert((SELECT created_at=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::timestamp(3) AND updated_at>=created_at FROM public.documents WHERE id=pg_temp.cd_uuid(95)));
SET LOCAL TIME ZONE 'UTC';

-- Every immutable table has a real row. A zero-row UPDATE is not an immutability test.
DO $$
DECLARE tab text;
BEGIN
  FOREACH tab IN ARRAY ARRAY['document_versions','document_reviews','payment_records','payment_record_events','certificates','certificate_events','service_request_events'] LOOP
    PERFORM pg_temp.cd_expect(format('UPDATE public.%I SET id=id',tab),'23514');
    PERFORM pg_temp.cd_expect(format('DELETE FROM public.%I',tab),'23514');
  END LOOP;
  -- Include FK dependents together WITHOUT CASCADE so the trigger, not an FK
  -- prerequisite error, rejects TRUNCATE. Nothing is ever actually truncated.
  PERFORM pg_temp.cd_expect('TRUNCATE public.documents,public.document_versions,public.document_reviews,public.identity_review_requests,public.payment_records,public.payment_record_events,public.certificates,public.certificate_events,public.verification_references,public.turnover_checklist_items','23514');
  PERFORM pg_temp.cd_expect('TRUNCATE public.service_request_events','23514');
  PERFORM pg_temp.cd_expect('TRUNCATE public.rewards_redemptions','23514');
END
$$;
