-- Prevent deletion of authorization scope parents from broadening grants.
-- This additive migration intentionally fails rather than nulling a scoped
-- company/project reference. Existing global grants (NULL scope) are unchanged.
BEGIN;

ALTER TABLE "roles"
  DROP CONSTRAINT "roles_company_id_fkey",
  ADD CONSTRAINT "roles_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_roles"
  DROP CONSTRAINT "user_roles_company_id_fkey",
  DROP CONSTRAINT "user_roles_project_id_fkey",
  ADD CONSTRAINT "user_roles_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "user_roles_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
