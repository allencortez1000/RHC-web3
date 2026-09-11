export const COMPANY_CODES = [
  'RHC',
  'AMICA_CONDO',
  'RHBC',
  'AMICA_WATER',
  'AMICA_MART',
  'RBAC',
  'RSSC',
  'COASTLINE',
] as const;

export type CompanyCode = (typeof COMPANY_CODES)[number];

export const ROLE_CODES = [
  'CUSTOMER',
  'SALES_AGENT',
  'SALES_MANAGER',
  'FINANCE_STAFF',
  'FINANCE_MANAGER',
  'PROPERTY_ADMIN',
  'DOCUMENT_OFFICER',
  'REWARDS_ADMIN',
  'COMPLIANCE_OFFICER',
  'DPO',
  'AUDITOR',
  'SYSTEM_ADMIN',
  'SUPER_ADMIN',
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export const PERMISSIONS = [
  'customer.view',
  'customer.edit',
  'company.view',
  'company.manage',
  'project.view',
  'project.create',
  'project.edit',
  'property.view',
  'property.create',
  'property.edit',
  'property.change_status',
  'customer_property.view',
  'customer_property.manage',
  'role.view',
  'role.manage',
  'permission.view',
  'permission.manage',
  'integration.view',
  'integration.manage',
  'feature_flag.view',
  'feature_flag.manage',
  'audit.view',
  'user.view',
  'user.manage',
  'system_settings.view',
  'system_settings.manage',
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number];

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta: { request_id: string };
};

export type ApiFailure = {
  success: false;
  error: { code: string; message: string };
  meta: { request_id: string };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type PropertyStatus =
  | 'AVAILABLE'
  | 'HELD'
  | 'RESERVED'
  | 'CONTRACTED'
  | 'SOLD'
  | 'FOR_TURNOVER'
  | 'TURNED_OVER'
  | 'BLOCKED';

export type AssetType = 'RESIDENTIAL' | 'COMMERCIAL' | 'PARKING';

export type CustomerPropertyRelationship =
  | 'RESERVEE'
  | 'BUYER'
  | 'CO_BUYER'
  | 'OWNER'
  | 'TENANT'
  | 'AUTHORIZED_REPRESENTATIVE';

export type DomainEventType =
  | 'USER.CREATED'
  | 'USER.VERIFIED'
  | 'RHC_ID.CREATED'
  | 'COMPANY.CREATED'
  | 'PROJECT.CREATED'
  | 'PROPERTY.CREATED'
  | 'PROPERTY.UPDATED'
  | 'PROPERTY.HELD'
  | 'PROPERTY.RESERVED'
  | 'CUSTOMER_PROPERTY.CREATED'
  | 'CONSENT.UPDATED'
  | 'ROLE.ASSIGNED'
  | 'INTEGRATION.UPDATED';

export type FeatureFlagKey =
  | 'ENABLE_REGISTRATION'
  | 'ENABLE_RHC_ID'
  | 'ENABLE_PROPERTIES'
  | 'ENABLE_COMPANY_DIRECTORY'
  | 'ENABLE_INTEGRATION_FRAMEWORK'
  | 'ENABLE_REWARDS'
  | 'ENABLE_WALLET'
  | 'ENABLE_MARKETPLACE'
  | 'ENABLE_BLOCKCHAIN'
  | 'ENABLE_EXTERNAL_WALLET'
  | 'ENABLE_TOKEN'
  | 'ENABLE_TOKEN_TRANSFER'
  | 'ENABLE_TOKEN_SALE'
  | 'ENABLE_CRYPTO_PAYMENT'
  | 'ENABLE_STAKING';
