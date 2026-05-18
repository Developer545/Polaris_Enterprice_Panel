import { AsyncLocalStorage } from 'async_hooks'
import { UnauthorizedException } from '@nestjs/common'
import type { TenantContext } from '@pos-dte/shared-types'

export const tenantStorage = new AsyncLocalStorage<TenantContext>()

export function getCurrentTenant(): TenantContext {
  const ctx = tenantStorage.getStore()
  if (!ctx) throw new UnauthorizedException('Sin contexto de tenant')
  return ctx
}

export function getCurrentTenantOrNull(): TenantContext | undefined {
  return tenantStorage.getStore()
}
