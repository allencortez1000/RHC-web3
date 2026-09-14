import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Grant, ListResource, ResourceScope } from './rbac.service';

export const REQUIRED_PERMISSION = 'required_permission';
export type PermissionPolicy = { permission: string; target?: 'global' | 'company' | 'property' | 'body-company' | 'body-project' | 'body-property' | 'api-client' | 'project' | 'relationship' | 'integration' | 'service'; list?: ListResource };
export type Authorization = { grants: Grant[]; scope: ResourceScope };
export const RequirePermission = (permission: string, options: Omit<PermissionPolicy, 'permission'> = {}) => SetMetadata(REQUIRED_PERMISSION, { permission, ...options });
export const Authorized = createParamDecorator((_: unknown, context: ExecutionContext): Authorization => context.switchToHttp().getRequest<{ authorization: Authorization }>().authorization);
