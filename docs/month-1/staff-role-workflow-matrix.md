# Month 1 Staff Role and Workflow Matrix

This matrix is derived from the role-permission definitions in
`packages/database/prisma/seed.ts` and the endpoint decorators in
`apps/api/src/modules/admin`. It is not a business approval of permissions
that are not present in the source.

| Role | Scope in seed | Intended existing workflow | Endpoint permissions used by that workflow | Status / boundary |
| --- | --- | --- | --- | --- |
| `CUSTOMER` | Global role definition, excluded from admin grants by `RbacService` | Customer self-service profile, consent, RHC ID, and linked-property reads | Customer routes use `AuthGuard` and ownership; the seeded legacy read permissions are not admin authority | **Working for customer routes; denied from Admin API.** |
| `SALES_AGENT` | Global role definition; assignments still determine tenant/project scope | Read customer/property context and existing customer-property relationships | `customer.view`, `project.view`, `property.view`, `customer_property.view` | **Working read-only within assigned scope.** No mutation grant. |
| `SALES_MANAGER` | Global role definition; assignments still determine tenant/project scope | Customer/property updates and relationship management | `customer.view`, `customer.edit`, `project.view`, `property.view`, `property.edit`, `customer_property.view`, `customer_property.manage` | **Working within scope.** First association of an otherwise unlinked customer is still blocked by the separate customer visibility check. |
| `FINANCE_STAFF` | Global role definition; assignments still determine tenant/project scope | Existing customer/property/relationship reference reads | `customer.view`, `property.view`, `customer_property.view` | **Working for existing read endpoints.** No finance-specific API is implemented. |
| `FINANCE_MANAGER` | Global role definition; assignments still determine tenant/project scope | Existing customer/property reads and customer metadata edit where applicable | `customer.view`, `customer.edit`, `property.view`, `customer_property.view` | **Partial.** No finance-specific API is implemented. |
| `PROPERTY_ADMIN` | Global role definition; assignments still determine tenant/project scope | Project/property administration and relationship management | `company.view`, `project.view`, `project.create`, `project.edit`, `property.view`, `property.create`, `property.edit`, `property.change_status`, `customer_property.view`, `customer_property.manage` | **Partial.** The role intentionally has no `customer.view`; linking a customer therefore requires an authorized visibility handoff or an approved least-privilege policy decision. |
| `DOCUMENT_OFFICER` | Global role definition; assignments still determine tenant/project scope | Existing customer and relationship reference/update workflow | `customer.view`, `customer.edit`, `customer_property.view` | **Partial.** No document-specific endpoint is implemented. |
| `REWARDS_ADMIN` | Global role definition; assignments still determine tenant/project scope | Read customer/company/integration foundations | `customer.view`, `company.view`, `integration.view` | **Partial / Month 2 boundary.** Rewards operations are not implemented and `ENABLE_REWARDS` remains server-locked. |
| `COMPLIANCE_OFFICER` | Global role definition; assignments still determine tenant/project scope | Customer/user/audit review | `customer.view`, `user.view`, `audit.view` | **Working for existing reads.** Verification approval additionally requires global `user.manage`, which this role does not receive. |
| `DPO` | Global role definition; assignments still determine tenant/project scope | Customer data review/edit and audit review | `customer.view`, `customer.edit`, `audit.view` | **Working for existing endpoints.** No legal-policy administration endpoint is implemented. |
| `AUDITOR` | Global read-only role definition | Read-only operational, governance, integration, feature, audit, and settings views | `company.view`, `project.view`, `property.view`, `customer_property.view`, `role.view`, `permission.view`, `integration.view`, `feature_flag.view`, `audit.view`, `user.view`, `system_settings.view` | **Working read-only.** No mutation permission is seeded. |
| `SYSTEM_ADMIN` | Global role definition | Global operational settings, users, features, and integration/service metadata | `company.view`, `project.view`, `property.view`, `role.view`, `permission.view`, `integration.view`, `integration.manage`, `feature_flag.view`, `feature_flag.manage`, `user.view`, `user.manage`, `system_settings.view`, `system_settings.manage` | **Partial.** It cannot perform `role.manage`, `permission.manage`, or property/project mutation permissions unless separately approved and assigned. |
| `SUPER_ADMIN` | Protected global role | Explicit bootstrap-only governance authority | New role definitions map the defined permission catalog; existing role mappings are not reconciled by rerunning the seed | **Protected / operator review required.** Ordinary assignment, deletion, and self-management paths reject this role. |

## Property linking decision boundary

`POST /admin/customer-properties` requires `customer_property.manage` on the
property and then independently checks `customer.view` against the target
customer's existing active tenant relationship. A known customer UUID is not
sufficient. This preserves tenant isolation but means a first association for
an otherwise unlinked customer cannot be completed by a tenant-only
`PROPERTY_ADMIN` or equivalent role. No bypass was added. An authorized
global operator handoff or an explicitly approved least-privilege policy is
required before changing this behavior.

## Admin landing behavior

`GET /admin/capabilities` is an authenticated, read-only, caller-specific
response containing only effective module read permissions and their bounded
RBAC scopes. The Admin Portal filters navigation and skips the dashboard when
`company.view` is absent. Direct resource endpoints remain authoritative and
continue to enforce their existing permission, feature, scope, account-status,
and customer-role checks. No permission is granted merely to make navigation
or a dashboard load.
