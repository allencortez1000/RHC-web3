# API Overview

Base path: `/api/v1/`

All responses follow:

```json
{ "success": true, "data": {}, "meta": { "request_id": "uuid" } }
```

Errors follow:

```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Readable description" }, "meta": { "request_id": "uuid" } }
```

Swagger is available at `/api/docs`.

Implemented endpoint groups:

- `POST /auth/register`, `/auth/login`, `/auth/logout`, `/auth/verify`, `/auth/session`
- `GET/PATCH /me`, `/me/rhc-id`, `/me/properties`, `/me/notifications`
- `GET /companies`, `/business-services`, `/projects`, `/properties/:id`
- `GET /admin/dashboard`, `/admin/users`, `/admin/customers`, `/admin/companies`, `/admin/projects`, `/admin/properties`, `/admin/roles`, `/admin/permissions`, `/admin/integrations`, `/admin/feature-flags`, `/admin/audit-logs`, `/admin/system-settings`
- Admin create/update routes for companies, projects, properties, customer-property relationships, and feature flags
