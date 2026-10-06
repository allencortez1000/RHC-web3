-- Synthetic baseline only. Executed by connected-domain-upgrade.ts prepare AFTER
-- exactly seven migrations / 29 owner tables / all 29 tables empty are confirmed.
-- This phase intentionally COMMITS. Never run this file directly or on business data.
-- One row in every retained table makes every before/after count/hash substantive.
-- No migration deployment, provider calls, secrets, activation or cleanup is performed.
CREATE FUNCTION pg_temp.cd_baseline_uuid(n integer) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
 SELECT md5('connected-domain-upgrade-baseline-' || n::text)::uuid
$$;
INSERT INTO public.users(id,email,auth_email_confirmed_at,updated_at) VALUES(pg_temp.cd_baseline_uuid(1),'cd-upgrade@example.invalid','2020-01-01','2020-01-01');
INSERT INTO public.rhc_id_sequences(year,last_value,updated_at) VALUES(2000,1,'2020-01-01');
INSERT INTO public.user_profiles(id,user_id,email,first_name,last_name,rhc_id,rhc_id_issued_at,verification_status,updated_at) VALUES(pg_temp.cd_baseline_uuid(2),pg_temp.cd_baseline_uuid(1),'cd-upgrade@example.invalid','Synthetic','Baseline','CD-UPGRADE-ISSUED','2020-01-01','VERIFIED','2020-01-01');
INSERT INTO public.companies(id,company_code,legal_name,display_name,rewards_enabled,digital_services_enabled,api_enabled,updated_at) VALUES(pg_temp.cd_baseline_uuid(3),'CD-UPGRADE','Synthetic baseline','Synthetic baseline',false,false,false,'2020-01-01');
INSERT INTO public.projects(id,company_id,project_code,project_name,updated_at) VALUES(pg_temp.cd_baseline_uuid(4),pg_temp.cd_baseline_uuid(3),'CD-UPGRADE-P','Synthetic project','2020-01-01');
INSERT INTO public.permissions(id,code) VALUES(pg_temp.cd_baseline_uuid(5),'CD_UPGRADE_SYNTHETIC');
INSERT INTO public.roles(id,company_id,code,name,updated_at) VALUES(pg_temp.cd_baseline_uuid(6),pg_temp.cd_baseline_uuid(3),'CD_UPGRADE_SYNTHETIC','Synthetic role','2020-01-01');
INSERT INTO public.role_permissions(id,role_id,permission_id) VALUES(pg_temp.cd_baseline_uuid(7),pg_temp.cd_baseline_uuid(6),pg_temp.cd_baseline_uuid(5));
INSERT INTO public.user_roles(id,user_id,role_id,company_id,project_id) VALUES(pg_temp.cd_baseline_uuid(8),pg_temp.cd_baseline_uuid(1),pg_temp.cd_baseline_uuid(6),pg_temp.cd_baseline_uuid(3),pg_temp.cd_baseline_uuid(4));
INSERT INTO public.properties(id,project_id,property_code,asset_type,updated_at) VALUES(pg_temp.cd_baseline_uuid(9),pg_temp.cd_baseline_uuid(4),'CD-UPGRADE-U','RESIDENTIAL','2020-01-01');
INSERT INTO public.reservations(id,reservation_number,customer_id,property_id,expires_at,updated_at) VALUES(pg_temp.cd_baseline_uuid(10),'CD-UPGRADE-R',pg_temp.cd_baseline_uuid(1),pg_temp.cd_baseline_uuid(9),'2099-01-01','2020-01-01');
INSERT INTO public.reservation_events(id,reservation_id,event_type,actor_user_id) VALUES(pg_temp.cd_baseline_uuid(11),pg_temp.cd_baseline_uuid(10),'CREATED',pg_temp.cd_baseline_uuid(1));
INSERT INTO public.property_status_history(id,property_id,next_status,actor_user_id,reservation_id) VALUES(pg_temp.cd_baseline_uuid(12),pg_temp.cd_baseline_uuid(9),'AVAILABLE',pg_temp.cd_baseline_uuid(1),pg_temp.cd_baseline_uuid(10));
INSERT INTO public.customer_properties(id,customer_id,property_id,relationship_type,updated_at) VALUES(pg_temp.cd_baseline_uuid(13),pg_temp.cd_baseline_uuid(1),pg_temp.cd_baseline_uuid(9),'RESERVEE','2020-01-01');
INSERT INTO public.business_services(id,company_id,service_code,service_name,service_type,updated_at) VALUES(pg_temp.cd_baseline_uuid(14),pg_temp.cd_baseline_uuid(3),'CD-UPGRADE-S','Synthetic service','SYNTHETIC','2020-01-01');
INSERT INTO public.company_integrations(id,company_id,integration_key,name,status,updated_at) VALUES(pg_temp.cd_baseline_uuid(15),pg_temp.cd_baseline_uuid(3),'CD-UPGRADE-I','Synthetic integration','NOT_CONFIGURED','2020-01-01');
INSERT INTO public.company_api_clients(id,company_id,client_name,client_id,scopes,status,updated_at) VALUES(pg_temp.cd_baseline_uuid(16),pg_temp.cd_baseline_uuid(3),'Synthetic inactive client','CD-UPGRADE-CLIENT',ARRAY[]::text[],'INACTIVE','2020-01-01');
INSERT INTO public.company_events(id,company_id,event_type,enabled) VALUES(pg_temp.cd_baseline_uuid(17),pg_temp.cd_baseline_uuid(3),'CD_UPGRADE_SYNTHETIC',false);
INSERT INTO public.integration_logs(id,integration_id,company_id,direction,event_type) VALUES(pg_temp.cd_baseline_uuid(18),pg_temp.cd_baseline_uuid(15),pg_temp.cd_baseline_uuid(3),'TEST','CD_UPGRADE_SYNTHETIC');
INSERT INTO public.notifications(id,user_id,channel,subject,body,status,sent_at) VALUES(pg_temp.cd_baseline_uuid(19),pg_temp.cd_baseline_uuid(1),'TEST','Synthetic baseline','Synthetic baseline','SENT',CURRENT_TIMESTAMP);
INSERT INTO public.consent_records(id,user_id,consent_type,company_id,consent_version,granted) VALUES(pg_temp.cd_baseline_uuid(20),pg_temp.cd_baseline_uuid(1),'PRIVACY_POLICY',pg_temp.cd_baseline_uuid(3),'CD-UPGRADE',false);
INSERT INTO public.feature_flags(id,key,enabled,updated_at) VALUES(pg_temp.cd_baseline_uuid(21),'CD_UPGRADE_SYNTHETIC',false,'2020-01-01');
INSERT INTO public.audit_logs(id,actor_user_id,company_id,project_id,action,entity_type) VALUES(pg_temp.cd_baseline_uuid(22),pg_temp.cd_baseline_uuid(1),pg_temp.cd_baseline_uuid(3),pg_temp.cd_baseline_uuid(4),'CD_UPGRADE_SYNTHETIC','SYNTHETIC');
INSERT INTO public.activity_events(id,event_type,actor_user_id,company_id,project_id) VALUES(pg_temp.cd_baseline_uuid(23),'CD_UPGRADE_SYNTHETIC',pg_temp.cd_baseline_uuid(1),pg_temp.cd_baseline_uuid(3),pg_temp.cd_baseline_uuid(4));
INSERT INTO public.rewards_accounts(id,customer_id,company_id,updated_at) VALUES(pg_temp.cd_baseline_uuid(24),pg_temp.cd_baseline_uuid(1),pg_temp.cd_baseline_uuid(3),'2020-01-01');
INSERT INTO public.rewards_rules(id,company_id,rule_code,active,updated_at) VALUES(pg_temp.cd_baseline_uuid(25),pg_temp.cd_baseline_uuid(3),'CD_UPGRADE_SYNTHETIC',false,'2020-01-01');
INSERT INTO public.rewards_transactions(id,rewards_account_id,customer_id,source_company_id,rule_id,transaction_number,transaction_type,amount,reason,status) VALUES(pg_temp.cd_baseline_uuid(26),pg_temp.cd_baseline_uuid(24),pg_temp.cd_baseline_uuid(1),pg_temp.cd_baseline_uuid(3),pg_temp.cd_baseline_uuid(25),'CD-UPGRADE-DEBIT','REDEEM',-10,'Synthetic baseline','POSTED');
INSERT INTO public.rewards_redemptions(id,customer_id,rewards_account_id,amount,updated_at) VALUES(pg_temp.cd_baseline_uuid(27),pg_temp.cd_baseline_uuid(1),pg_temp.cd_baseline_uuid(24),10,'2020-01-01');
INSERT INTO public.system_settings(id,key,value,updated_at) VALUES(pg_temp.cd_baseline_uuid(28),'CD_UPGRADE_SYNTHETIC','{}','2020-01-01');
