import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { TenantClientFactory } from '../../../infrastructure/prisma/tenant-client.factory'
import { getEnv } from '../../../config/env'
import { z } from 'zod'

// ── Schemas ───────────────────────────────────────────────────────────────────

export const CreateDepartamentoSchema = z.object({
  codigo: z.string().min(1).max(10),
  nombre: z.string().min(2),
})
export const UpdateDepartamentoSchema = CreateDepartamentoSchema.partial()

export const CreateMunicipioSchema = z.object({
  codigo: z.string().min(1).max(10),
  nombre: z.string().min(2),
  departamentoCod: z.string().min(1),
})
export const UpdateMunicipioSchema = CreateMunicipioSchema.partial().omit({ departamentoCod: true })

export const CreateActividadSchema = z.object({
  codigo: z.string().min(1).max(20),
  nombre: z.string().min(2),
})
export const UpdateActividadSchema = CreateActividadSchema.partial()

export type CreateDepartamentoDto = z.infer<typeof CreateDepartamentoSchema>
export type UpdateDepartamentoDto = z.infer<typeof UpdateDepartamentoSchema>
export type CreateMunicipioDto = z.infer<typeof CreateMunicipioSchema>
export type UpdateMunicipioDto = z.infer<typeof UpdateMunicipioSchema>
export type CreateActividadDto = z.infer<typeof CreateActividadSchema>
export type UpdateActividadDto = z.infer<typeof UpdateActividadSchema>

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class CatalogsAdminService {
  constructor(private readonly clientFactory: TenantClientFactory) {}

  private getDb() {
    return this.clientFactory.getClient(getEnv().SHARED_TENANT_DATABASE_URL)
  }

  // ── Departamentos ───────────────────────────────────────────────────────

  findAllDepartamentos() {
    return this.getDb().departamento.findMany({
      include: { _count: { select: { municipios: true } } },
      orderBy: { nombre: 'asc' },
    })
  }

  async findDepartamento(id: string) {
    const row = await this.getDb().departamento.findUnique({ where: { id }, include: { municipios: true } })
    if (!row) throw new NotFoundException('Departamento no encontrado')
    return row
  }

  async createDepartamento(dto: CreateDepartamentoDto) {
    const existing = await this.getDb().departamento.findUnique({ where: { codigo: dto.codigo } })
    if (existing) throw new ConflictException(`Ya existe un departamento con código ${dto.codigo}`)
    return this.getDb().departamento.create({ data: dto })
  }

  async updateDepartamento(id: string, dto: UpdateDepartamentoDto) {
    await this.findDepartamento(id)
    return this.getDb().departamento.update({ where: { id }, data: dto })
  }

  async toggleDepartamento(id: string) {
    const row = await this.findDepartamento(id)
    return this.getDb().departamento.update({ where: { id }, data: { isActive: !row.isActive } })
  }

  // ── Municipios ──────────────────────────────────────────────────────────

  async findAllMunicipios(departamentoCod?: string) {
    return this.getDb().municipio.findMany({
      where: departamentoCod ? { departamentoCod } : undefined,
      include: { departamento: { select: { nombre: true, codigo: true } } },
      orderBy: [{ departamentoCod: 'asc' }, { nombre: 'asc' }],
    })
  }

  async findMunicipio(id: string) {
    const row = await this.getDb().municipio.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('Municipio no encontrado')
    return row
  }

  async createMunicipio(dto: CreateMunicipioDto) {
    const dept = await this.getDb().departamento.findUnique({ where: { codigo: dto.departamentoCod } })
    if (!dept) throw new NotFoundException(`Departamento con código ${dto.departamentoCod} no encontrado`)
    const existing = await this.getDb().municipio.findUnique({
      where: { departamentoCod_codigo: { departamentoCod: dto.departamentoCod, codigo: dto.codigo } },
    })
    if (existing) throw new ConflictException(`Ya existe un municipio con código ${dto.codigo} en ese departamento`)
    return this.getDb().municipio.create({ data: dto })
  }

  async updateMunicipio(id: string, dto: UpdateMunicipioDto) {
    await this.findMunicipio(id)
    return this.getDb().municipio.update({ where: { id }, data: dto })
  }

  async toggleMunicipio(id: string) {
    const row = await this.findMunicipio(id)
    return this.getDb().municipio.update({ where: { id }, data: { isActive: !row.isActive } })
  }

  // ── Actividades Económicas ──────────────────────────────────────────────

  findAllActividades() {
    return this.getDb().actividadEconomica.findMany({ orderBy: { nombre: 'asc' } })
  }

  async findActividad(id: string) {
    const row = await this.getDb().actividadEconomica.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('Actividad económica no encontrada')
    return row
  }

  async createActividad(dto: CreateActividadDto) {
    const existing = await this.getDb().actividadEconomica.findUnique({ where: { codigo: dto.codigo } })
    if (existing) throw new ConflictException(`Ya existe una actividad con código ${dto.codigo}`)
    return this.getDb().actividadEconomica.create({ data: dto })
  }

  async updateActividad(id: string, dto: UpdateActividadDto) {
    await this.findActividad(id)
    return this.getDb().actividadEconomica.update({ where: { id }, data: dto })
  }

  async toggleActividad(id: string) {
    const row = await this.findActividad(id)
    return this.getDb().actividadEconomica.update({ where: { id }, data: { isActive: !row.isActive } })
  }
}
