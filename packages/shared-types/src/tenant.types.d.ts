export interface TenantContext {
    tenantId: string;
    slug: string;
    dbStrategy: 'NEON_SHARED' | 'NEON_DEDICATED' | 'LOCAL_DEDICATED';
    dbUrl?: string;
}
export interface ApiResponse<T> {
    data: T;
    message?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface PaginationQuery {
    page?: number;
    limit?: number;
    search?: string;
}
