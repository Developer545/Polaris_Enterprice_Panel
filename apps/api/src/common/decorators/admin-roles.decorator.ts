import { SetMetadata } from '@nestjs/common'
import type { JwtAdminPayload } from '@pos-dte/shared-types'

export type AdminRole = JwtAdminPayload['role']
export const ADMIN_ROLES_KEY = 'adminRoles'
export const RequireAdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles)
