import { z } from 'zod';
import { listQuery, projectCreate, uuid } from './dto';

const text = z.string().trim().min(1).max(160);
const description = z.string().trim().max(500).nullable().optional();
const code = z.string().regex(/^[A-Z][A-Z0-9_:-]{1,79}$/);
const date = z.string().datetime({ offset: true }).transform((value) => new Date(value));
const nonempty = (value: object) => Object.keys(value).length > 0;
export const reviewReference = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/);
export const reviewedAction = z.object({ review_reference: reviewReference }).strict();
export const projectPatch = projectCreate.omit({ company_id: true, project_code: true }).extend({ start_date: date.nullable().optional(), target_completion: date.nullable().optional() }).partial().strict().refine(nonempty, 'At least one field is required');
export const relationshipPatch = z.object({ relationship_type: z.enum(['RESERVEE', 'BUYER', 'CO_BUYER', 'OWNER', 'TENANT', 'AUTHORIZED_REPRESENTATIVE']).optional(), status: z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED', 'REVOKED']).optional(), effective_from: date.optional(), effective_to: date.nullable().optional() }).strict().refine(nonempty, 'At least one field is required');
const accountStatus = z.enum(['PENDING', 'ACTIVE', 'DISABLED', 'LOCKED']);
export const userStatusPatch = z.object({ account_status: accountStatus, expected_status: accountStatus, review_reference: reviewReference }).strict();
export const roleCreate = z.object({ code, name: text, description, company_id: uuid.optional() }).strict();
export const rolePatch = roleCreate.pick({ name: true, description: true }).partial().strict().refine(nonempty, 'At least one field is required');
export const userRoleCreate = z.object({ user_id: uuid, role_id: uuid, company_id: uuid.optional(), project_id: uuid.optional(), expires_at: date.refine((value) => value > new Date(), 'Expiry must be in the future').optional(), review_reference: reviewReference }).strict();
export const userRoleQuery = listQuery.extend({ user_id: uuid.optional(), role_id: uuid.optional() }).strict();
export const rolePermissionsReplace = reviewedAction.extend({ permission_ids: z.array(uuid).max(200).refine((values) => new Set(values).size === values.length, 'Duplicate permissions') }).strict();
const integrationStatus = z.enum(['NOT_CONFIGURED', 'PREPARED', 'ACTIVE', 'SUSPENDED', 'ERROR']);
export const integrationCreate = z.object({ company_id: uuid, integration_key: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{1,79}$/), name: text, status: integrationStatus.optional() }).strict();
export const integrationPatch = integrationCreate.pick({ name: true, status: true }).partial().strict().refine(nonempty, 'At least one field is required');
export const businessServiceCreate = z.object({ company_id: uuid, service_code: code, service_name: text, service_type: code, description, status: z.enum(['ACTIVE', 'PREPARED', 'COMING_SOON', 'DISABLED']).optional(), requires_property: z.boolean().optional(), requires_resident_status: z.boolean().optional(), integration_status: integrationStatus.optional() }).strict();
export const businessServicePatch = businessServiceCreate.omit({ company_id: true, service_code: true }).partial().strict().refine(nonempty, 'At least one field is required');

// Only display/contact/acceptance metadata. Security, authentication, billing and
// runtime feature configuration cannot be written through the settings API.
export const managedSetting = z.discriminatedUnion('key', [
  z.object({ key: z.literal('support_contact'), value: z.object({ email: z.string().email().max(254) }).strict() }).strict(),
  z.object({ key: z.literal('maintenance_notice'), value: z.object({ enabled: z.boolean(), message: z.string().trim().max(500) }).strict() }).strict(),
  z.object({ key: z.literal('month_1_acceptance_state'), value: z.object({ status: z.enum(['foundation_seeded', 'under_review', 'accepted']) }).strict() }).strict(),
]);
export const settingBody = z.object({ value: z.unknown(), review_reference: reviewReference }).strict();
