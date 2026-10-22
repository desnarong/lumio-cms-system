import { SetMetadata } from '@nestjs/common';
import type { Role } from '@lumio/shared';

export const ROLES_KEY = 'lumio:roles';

/** Roles allowed to call a route; enforced by RolesGuard (docs/design/13-rbac.md). */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
