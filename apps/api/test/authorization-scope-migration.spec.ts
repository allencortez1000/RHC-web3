import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repositoryRoot = resolve(__dirname, '../../../');
const schema = readFileSync(resolve(repositoryRoot, 'packages/database/prisma/schema.prisma'), 'utf8');
const migration = readFileSync(resolve(repositoryRoot, 'packages/database/prisma/migrations/202609150001_authorization_scope_delete_restrict/migration.sql'), 'utf8');

describe('authorization scope deletion protection', () => {
  it('declares restrictive Prisma actions for nullable authorization scopes', () => {
    expect(schema).toContain('company          Company?         @relation(fields: [company_id], references: [id], onDelete: Restrict)');
    expect(schema).toContain('company    Company?  @relation(fields: [company_id], references: [id], onDelete: Restrict)');
    expect(schema).toContain('project    Project?  @relation(fields: [project_id], references: [id], onDelete: Restrict)');
  });

  it('replaces the historical SET NULL actions without changing intentional global rows', () => {
    expect(migration).toContain('DROP CONSTRAINT "roles_company_id_fkey"');
    expect(migration).toContain('DROP CONSTRAINT "user_roles_company_id_fkey"');
    expect(migration).toContain('DROP CONSTRAINT "user_roles_project_id_fkey"');
    expect(migration.match(/ON DELETE RESTRICT/g)).toHaveLength(3);
    expect(migration).not.toContain('ON DELETE SET NULL');
    expect(migration).toContain('Existing global grants (NULL scope) are unchanged.');
  });
});
