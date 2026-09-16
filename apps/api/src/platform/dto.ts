import { z } from 'zod';
import { profileSchema, propertySchema } from '@rhc/validation';

const text = z.string().trim().min(1).max(160);
const optionalText = z.string().trim().max(500).nullable().optional();
const timestamp = z.string().datetime({ offset: true }).transform((value) => new Date(value));
const nonempty = (value: object) => Object.keys(value).length > 0;
export const uuid = z.string().uuid();
export const listQuery = z.object({ company_id: uuid.optional(), project_id: uuid.optional(), take: z.coerce.number().int().min(1).max(200).default(100), skip: z.coerce.number().int().min(0).max(100000).default(0) }).strict();
export const propertyQuery = listQuery.extend({ status: propertySchema.shape.status.optional(), asset_type: propertySchema.shape.asset_type.optional(), q: z.string().trim().min(1).max(80).optional() }).strict();
export const companyCreate = z.object({ company_code: z.string().regex(/^[A-Z0-9_-]{2,40}$/), legal_name: text, display_name: text, description: optionalText, business_type: optionalText }).strict();
export const companyUpdate = companyCreate.omit({ company_code: true }).extend({ status: z.enum(['ACTIVE', 'INACTIVE', 'PREPARED', 'SUSPENDED']).optional(), digital_services_enabled: z.boolean().optional(), api_enabled: z.boolean().optional() }).partial().strict().refine(nonempty, 'At least one field is required');
export const projectCreate = z.object({ company_id: uuid, project_code: z.string().regex(/^[A-Z0-9_-]{2,80}$/), project_name: text, description: optionalText, location: optionalText, status: z.enum(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(), start_date: timestamp.optional(), target_completion: timestamp.optional() }).strict();
// Metadata is intentionally not a free-form write API. Add typed keys as features require them.
export const propertyCreate = propertySchema.extend({ metadata: z.object({}).strict().default({}), area: z.number().finite().positive().max(9999999999.99).nullable().optional(), list_price: z.number().finite().nonnegative().max(9999999999999.99).nullable().optional(), currency: z.string().regex(/^[A-Z]{3}$/).default('PHP') }).strict();
export const propertyUpdate = propertyCreate.omit({ project_id: true, metadata: true }).partial().strict().refine(nonempty, 'At least one field is required');
export const customerPropertyCreate = z.object({ customer_id: uuid, property_id: uuid, relationship_type: z.enum(['RESERVEE', 'BUYER', 'CO_BUYER', 'OWNER', 'TENANT', 'AUTHORIZED_REPRESENTATIVE']), status: z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED', 'REVOKED']).optional(), effective_from: timestamp.optional(), effective_to: timestamp.optional() }).strict().refine((data) => !data.effective_to || data.effective_to > (data.effective_from ?? new Date()), 'Invalid effective dates');
export const reservationCreate = z.object({ property_id: uuid }).strict();
export const adminReservationCreate = reservationCreate.extend({ customer_id: uuid }).strict();
export const reservationAction = z.object({ review_reference: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/), note: z.string().trim().max(500).optional() }).strict();
export const reservationQuery = listQuery.extend({ status: z.enum(['PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'CONVERTED']).optional() }).strict();
export const flagUpdate = z.object({ enabled: z.boolean() }).strict();
export const verificationApproval = z.object({ expected_status: z.enum(['UNVERIFIED', 'PENDING', 'REJECTED']), review_reference: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/) }).strict();
export const profileUpdate = profileSchema.extend({ mobile_number: z.string().trim().regex(/^\+[1-9][0-9]{7,14}$/).nullable().optional(), birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => { const date = new Date(value); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= new Date(); }, 'Invalid birth date').transform((value) => new Date(value)).nullable().optional() }).partial().strict().refine(nonempty, 'At least one field is required');
export const emptyBody = z.object({}).strict();
export const apiScope = z.enum(['company.read', 'projects.read', 'properties.read', 'identity.verify', 'events.write']);
export const apiClientCreate = z.object({ company_id: uuid, client_name: text, scopes: z.array(apiScope).min(1).max(apiScope.options.length).refine((scopes) => new Set(scopes).size === scopes.length, 'Duplicate scopes') }).strict();
