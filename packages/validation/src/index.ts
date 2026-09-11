import { z } from 'zod';

export const registerSchema = z
  .object({
    email: z.string().email(),
    mobile_number: z.string().min(7).max(32),
    password: z.string().min(12).max(128),
    confirm_password: z.string(),
    privacy_terms_acceptance: z.literal(true),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export const profileSchema = z.object({
  first_name: z.string().min(1).max(100),
  middle_name: z.string().max(100).optional().nullable(),
  last_name: z.string().min(1).max(100),
  suffix: z.string().max(32).optional().nullable(),
  birth_date: z.string().optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  address_line: z.string().max(255).optional().nullable(),
  barangay: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  province: z.string().max(120).optional().nullable(),
  postal_code: z.string().max(32).optional().nullable(),
  country: z.string().max(80).default('Philippines'),
});

export const propertySchema = z.object({
  project_id: z.string().uuid(),
  property_code: z.string().min(1).max(80),
  tower: z.string().max(80).optional().nullable(),
  floor: z.string().max(32).optional().nullable(),
  unit_number: z.string().max(80).optional().nullable(),
  asset_type: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'PARKING']),
  area: z.number().positive().optional().nullable(),
  list_price: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).default('PHP'),
  status: z.enum([
    'AVAILABLE',
    'HELD',
    'RESERVED',
    'CONTRACTED',
    'SOLD',
    'FOR_TURNOVER',
    'TURNED_OVER',
    'BLOCKED',
  ]),
  metadata: z.record(z.unknown()).default({}),
});
