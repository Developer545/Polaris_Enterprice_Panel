// Re-export generated Prisma clients and types
// Usage in API: import { ControlPlanePrisma, TenantPrisma } from '@pos-dte/db'

export { PrismaClient as ControlPlanePrismaClient } from '../generated/control-plane'
export { PrismaClient as TenantPrismaClient } from '../generated/tenant'

export * from '../generated/control-plane'
export * as TenantTypes from '../generated/tenant'
