import { Controller, Get, Param, Query } from '@nestjs/common'
import { CatalogsService } from './catalogs.service'

/**
 * Read-only catalog endpoints for tenant users.
 * Used by web/electron to populate Departamento, Municipio, ActividadEconomica selects.
 */
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly svc: CatalogsService) {}

  @Get('departamentos')
  findAllDepartamentos() {
    return this.svc.findAllDepartamentos()
  }

  @Get('departamentos/:cod/municipios')
  findMunicipios(@Param('cod') cod: string) {
    return this.svc.findMunicipiosByDepartamento(cod)
  }

  @Get('actividades')
  findAllActividades() {
    return this.svc.findAllActividades()
  }

  @Get('zona')
  getZona(@Query('depto') depto: string, @Query('municipio') municipio: string) {
    return this.svc.getZona(depto, municipio)
  }
}
