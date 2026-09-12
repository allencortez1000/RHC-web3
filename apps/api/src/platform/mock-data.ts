export const mockNow = new Date('2026-09-11T00:00:00.000Z');

export const mockCompanies = [
  { id: 'mock-company-rhc', company_code: 'RHC', legal_name: 'Rabino Holdings Corporation', display_name: 'RHC', description: 'Corporate parent and RHC Digital operator', business_type: 'Holding Company', status: 'ACTIVE', logo_url: null, integration_status: 'PREPARED', rewards_enabled: false, digital_services_enabled: true, api_enabled: true, created_at: mockNow, updated_at: mockNow },
  { id: 'mock-company-amica-condo', company_code: 'AMICA_CONDO', legal_name: 'Amica Condominium Realty Corporation', display_name: 'AMICA', description: 'Property and resident services', business_type: 'Real Estate', status: 'ACTIVE', logo_url: null, integration_status: 'PREPARED', rewards_enabled: false, digital_services_enabled: true, api_enabled: true, created_at: mockNow, updated_at: mockNow },
  { id: 'mock-company-rhbc', company_code: 'RHBC', legal_name: 'Rabino Home Builders Corporation', display_name: 'RHBC', description: 'Construction and project information', business_type: 'Construction', status: 'PREPARED', logo_url: null, integration_status: 'PREPARED', rewards_enabled: false, digital_services_enabled: true, api_enabled: false, created_at: mockNow, updated_at: mockNow },
  { id: 'mock-company-water', company_code: 'AMICA_WATER', legal_name: 'Amica Water Co. Ltd.', display_name: 'AMICA WATER', description: 'Utility services', business_type: 'Utilities', status: 'PREPARED', logo_url: null, integration_status: 'PREPARED', rewards_enabled: false, digital_services_enabled: true, api_enabled: false, created_at: mockNow, updated_at: mockNow },
  { id: 'mock-company-mart', company_code: 'AMICA_MART', legal_name: 'Amica Mart Trading Corporation', display_name: 'AMICA MART', description: 'Retail and future rewards', business_type: 'Retail', status: 'PREPARED', logo_url: null, integration_status: 'PREPARED', rewards_enabled: false, digital_services_enabled: true, api_enabled: false, created_at: mockNow, updated_at: mockNow },
  { id: 'mock-company-rbac', company_code: 'RBAC', legal_name: 'Rabino Broadcasting and Advertising Corporation', display_name: 'RBAC', description: 'Communications and promotions', business_type: 'Media', status: 'PREPARED', logo_url: null, integration_status: 'PREPARED', rewards_enabled: false, digital_services_enabled: true, api_enabled: false, created_at: mockNow, updated_at: mockNow },
  { id: 'mock-company-rssc', company_code: 'RSSC', legal_name: 'Rabino Security Services Corporation', display_name: 'RSSC', description: 'Resident and security services', business_type: 'Security', status: 'PREPARED', logo_url: null, integration_status: 'PREPARED', rewards_enabled: false, digital_services_enabled: true, api_enabled: false, created_at: mockNow, updated_at: mockNow },
  { id: 'mock-company-coastline', company_code: 'COASTLINE', legal_name: 'Coastline Food Corporation', display_name: 'COASTLINE', description: 'Commerce and loyalty participation', business_type: 'Commerce', status: 'PREPARED', logo_url: null, integration_status: 'PREPARED', rewards_enabled: false, digital_services_enabled: true, api_enabled: false, created_at: mockNow, updated_at: mockNow },
];

export const mockProjects = [
  { id: 'mock-project-amica-t1', company_id: 'mock-company-amica-condo', project_code: 'AMICA-T1', project_name: 'Amica Residences Tower 1', description: 'Initial RHC Digital pilot property project', location: 'Philippines', status: 'ACTIVE', start_date: null, target_completion: null, created_at: mockNow, updated_at: mockNow, company: mockCompanies[1] },
];

export const mockProperties = [
  { id: 'mock-property-res-0501', project_id: 'mock-project-amica-t1', property_code: 'AMICA-T1-RES-0501', tower: 'Tower 1', floor: '5', unit_number: '501', asset_type: 'RESIDENTIAL', area: '52.00', list_price: '6200000.00', currency: 'PHP', status: 'AVAILABLE', metadata: { mock: true }, created_at: mockNow, updated_at: mockNow, project: mockProjects[0] },
  { id: 'mock-property-res-0502', project_id: 'mock-project-amica-t1', property_code: 'AMICA-T1-RES-0502', tower: 'Tower 1', floor: '5', unit_number: '502', asset_type: 'RESIDENTIAL', area: '48.00', list_price: '5800000.00', currency: 'PHP', status: 'HELD', metadata: { mock: true }, created_at: mockNow, updated_at: mockNow, project: mockProjects[0] },
  { id: 'mock-property-com-g01', project_id: 'mock-project-amica-t1', property_code: 'AMICA-T1-COM-G01', tower: 'Tower 1', floor: 'G', unit_number: 'C01', asset_type: 'COMMERCIAL', area: '72.00', list_price: '9800000.00', currency: 'PHP', status: 'AVAILABLE', metadata: { mock: true }, created_at: mockNow, updated_at: mockNow, project: mockProjects[0] },
  { id: 'mock-property-park-b1-001', project_id: 'mock-project-amica-t1', property_code: 'AMICA-T1-PARK-B1-001', tower: 'Tower 1', floor: 'B1', unit_number: 'P001', asset_type: 'PARKING', area: '12.00', list_price: '900000.00', currency: 'PHP', status: 'AVAILABLE', metadata: { mock: true }, created_at: mockNow, updated_at: mockNow, project: mockProjects[0] },
];

export const mockBusinessServices = [
  { id: 'mock-service-property', company_id: 'mock-company-amica-condo', service_code: 'PROPERTY_SERVICES', service_name: 'Property Services', service_type: 'PROPERTY', description: 'Property and resident service foundation', status: 'ACTIVE', rewards_eligible: false, wallet_eligible: false, requires_property: true, requires_resident_status: true, integration_status: 'PREPARED', created_at: mockNow, updated_at: mockNow, company: { company_code: 'AMICA_CONDO', display_name: 'AMICA' } },
  { id: 'mock-service-water', company_id: 'mock-company-water', service_code: 'WATER_ACCOUNT', service_name: 'Water Account', service_type: 'UTILITY', description: 'Future utility account integration', status: 'PREPARED', rewards_eligible: false, wallet_eligible: false, requires_property: false, requires_resident_status: false, integration_status: 'PREPARED', created_at: mockNow, updated_at: mockNow, company: { company_code: 'AMICA_WATER', display_name: 'AMICA WATER' } },
  { id: 'mock-service-mart', company_id: 'mock-company-mart', service_code: 'RETAIL_REWARDS', service_name: 'Retail Rewards', service_type: 'RETAIL', description: 'Future retail rewards integration', status: 'PREPARED', rewards_eligible: true, wallet_eligible: false, requires_property: false, requires_resident_status: false, integration_status: 'PREPARED', created_at: mockNow, updated_at: mockNow, company: { company_code: 'AMICA_MART', display_name: 'AMICA MART' } },
];

export const mockUser = { id: 'mock-user-customer', email: 'customer@example.com', mobile_number: '+639000000000', account_status: 'ACTIVE', verification_status: 'VERIFIED', created_at: mockNow, updated_at: mockNow };

export const mockProfile = { id: 'mock-profile-customer', user_id: mockUser.id, first_name: 'Demo', middle_name: null, last_name: 'Customer', suffix: null, birth_date: null, nationality: 'Filipino', address_line: 'Demo Address', barangay: 'Demo Barangay', city: 'Demo City', province: 'Demo Province', postal_code: '0000', country: 'Philippines', email: mockUser.email, mobile_number: mockUser.mobile_number, rhc_id: 'RHC-2026-00000001', rhc_id_issued_at: mockNow, account_status: 'ACTIVE', verification_status: 'VERIFIED', created_at: mockNow, updated_at: mockNow };

export const mockUsers = [{ ...mockUser, profile: mockProfile, roles: [] }];

export const mockCustomerProperties = [
  { id: 'mock-customer-property-1', customer_id: mockUser.id, property_id: mockProperties[0].id, relationship_type: 'BUYER', status: 'ACTIVE', effective_from: mockNow, effective_to: null, created_at: mockNow, updated_at: mockNow, property: mockProperties[0] },
];

export const mockFeatureFlags = [
  ['ENABLE_REGISTRATION', true], ['ENABLE_RHC_ID', true], ['ENABLE_PROPERTIES', true], ['ENABLE_COMPANY_DIRECTORY', true], ['ENABLE_INTEGRATION_FRAMEWORK', true], ['ENABLE_REWARDS', false], ['ENABLE_WALLET', false], ['ENABLE_MARKETPLACE', false], ['ENABLE_BLOCKCHAIN', false], ['ENABLE_EXTERNAL_WALLET', false], ['ENABLE_TOKEN', false], ['ENABLE_TOKEN_TRANSFER', false], ['ENABLE_TOKEN_SALE', false], ['ENABLE_CRYPTO_PAYMENT', false], ['ENABLE_STAKING', false],
].map(([key, enabled]) => ({ id: `mock-flag-${key}`, key, description: `Mock feature flag ${key}`, enabled, scope: 'GLOBAL', metadata: {}, created_at: mockNow, updated_at: mockNow }));

export const mockPermissions = ['customer.view', 'customer.edit', 'company.view', 'company.manage', 'project.view', 'project.create', 'project.edit', 'property.view', 'property.create', 'property.edit', 'property.change_status', 'role.view', 'role.manage', 'permission.view', 'permission.manage', 'integration.view', 'integration.manage', 'feature_flag.view', 'feature_flag.manage', 'audit.view', 'user.view', 'user.manage'].map((code) => ({ id: `mock-permission-${code}`, code, description: code, created_at: mockNow }));

export const mockRoles = ['CUSTOMER', 'PROPERTY_ADMIN', 'AUDITOR', 'SUPER_ADMIN'].map((code) => ({ id: `mock-role-${code}`, company_id: null, code, name: code.replaceAll('_', ' '), description: `Mock ${code}`, is_system: true, created_at: mockNow, updated_at: mockNow, role_permissions: mockPermissions.map((permission) => ({ permission })) }));

export const mockAuditLogs = [
  { id: 'mock-audit-1', actor_user_id: mockUser.id, actor_role: 'SUPER_ADMIN', company_id: null, project_id: null, action: 'mock.system.ready', entity_type: 'system', entity_id: 'mock', before_data: null, after_data: { mock: true }, ip_address: '127.0.0.1', user_agent: 'mock-local', request_id: 'mock-request', correlation_id: 'mock-correlation', created_at: mockNow },
];

export const mockIntegrations = mockCompanies.map((company) => ({ id: `mock-integration-${company.company_code}`, company_id: company.id, integration_key: `${company.company_code}_MOCK`, name: `${company.display_name} Mock Integration`, status: company.company_code === 'AMICA_CONDO' ? 'PREPARED' : 'NOT_CONFIGURED', config: {}, created_at: mockNow, updated_at: mockNow, company }));

export const mockSystemSettings = [{ id: 'mock-setting-month1', key: 'mock_data_mode', value: { enabled: true }, description: 'Local development mock data mode', created_at: mockNow, updated_at: mockNow }];

export function isMockDataEnabled(): boolean {
  const environment = process.env.NODE_ENV;
  if ((environment === 'staging' || environment === 'production') && process.env.USE_MOCK_DATA === 'true') {
    throw new Error('USE_MOCK_DATA is prohibited in staging and production');
  }
  return process.env.USE_MOCK_DATA === 'true';
}
