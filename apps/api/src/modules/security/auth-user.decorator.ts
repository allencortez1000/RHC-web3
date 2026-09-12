import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export type AuthUser = { id: string; email: string; supabase_user_id?: string; verification_status?: string; account_status?: string };
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<{ user?: AuthUser }>().user);
