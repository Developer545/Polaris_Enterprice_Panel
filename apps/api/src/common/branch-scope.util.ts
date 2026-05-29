import { ForbiddenException } from '@nestjs/common'
import type { JwtAccessPayload } from '@pos-dte/shared-types'

/**
 * Builds the Prisma `where` fragment that scopes a query to the branches a user
 * may see. Owners (canViewAllBranches) see every branch; an optional
 * requestedBranchId lets them drill down into one. Regular users are confined to
 * their assigned branchIds and may only request a branch they belong to.
 */
export function buildBranchWhere(
  user: JwtAccessPayload,
  requestedBranchId?: string,
): { branchId?: string | { in: string[] } } {
  if (user.canViewAllBranches) {
    if (requestedBranchId) {
      return { branchId: requestedBranchId }
    }
    return {}
  }

  if (requestedBranchId) {
    if (!user.branchIds.includes(requestedBranchId)) {
      throw new ForbiddenException('Sucursal no autorizada')
    }
    return { branchId: requestedBranchId }
  }

  return { branchId: { in: user.branchIds } }
}

/**
 * Throws unless the user may act on the given branch. Owners always pass.
 */
export function assertBranchAccess(user: JwtAccessPayload, branchId: string): void {
  if (user.canViewAllBranches) return
  if (!user.branchIds.includes(branchId)) {
    throw new ForbiddenException('Sucursal no autorizada')
  }
}

/**
 * Resolves the branchId to stamp on a newly-created row. Owners must pass an
 * explicit branchId; regular users default to their first assigned branch when
 * none is given, but a provided branch must be one they belong to.
 */
export function resolveWriteBranchId(
  user: JwtAccessPayload,
  requestedBranchId?: string,
): string {
  if (requestedBranchId) {
    assertBranchAccess(user, requestedBranchId)
    return requestedBranchId
  }
  const first = user.branchIds[0]
  if (!first) throw new ForbiddenException('Usuario sin sucursal asignada')
  return first
}
