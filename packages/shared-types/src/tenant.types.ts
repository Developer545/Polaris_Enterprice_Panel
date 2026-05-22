// Tenant context passed through AsyncLocalStorage in NestJS

export interface TenantContext {
  tenantId: string
  slug: string
  dbStrategy: 'NEON_SHARED' | 'NEON_DEDICATED' | 'LOCAL_DEDICATED'
  dbUrl?: string                        // only for DEDICATED strategies
  modules: Record<string, boolean>      // { pos: true, dte: true, compras: false, ... }
  dteAllowedTypes: string[]             // DTE types allowed by admin: ["01","03","05"]
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Common query params ──────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number
  limit?: number
  search?: string
}
