import { Injectable, NotFoundException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getEnv } from '../../../config/env'

/**
 * Catalog service — global data (no tenantId).
 * Tables: Departamento, Municipio, ActividadEconomica.
 * Always uses SHARED_TENANT_DATABASE_URL since catalogs are global.
 */
@Injectable()
export class CatalogsService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    return this.clientFactory.getClient(getEnv().SHARED_TENANT_DATABASE_URL)
  }

  // ── Departamentos ─────────────────────────────────────────────────────────

  findAllDepartamentos() {
    return this.getDb().departamento.findMany({
      where: { isActive: true },
      select: { id: true, codigo: true, nombre: true },
      orderBy: { nombre: 'asc' },
    })
  }

  // ── Municipios ────────────────────────────────────────────────────────────

  findMunicipiosByDepartamento(departamentoCod: string) {
    return this.getDb().municipio.findMany({
      where: { departamentoCod, isActive: true },
      select: { id: true, codigo: true, nombre: true, departamentoCod: true },
      orderBy: { nombre: 'asc' },
    })
  }

  // ── Actividades Económicas ────────────────────────────────────────────────

  findAllActividades() {
    return this.getDb().actividadEconomica.findMany({
      where: { isActive: true },
      select: { id: true, codigo: true, nombre: true },
      orderBy: { nombre: 'asc' },
    })
  }
}
