import { Controller, Get, Put, Post, Body, Param } from '@nestjs/common'
import { CompanyService, UpdateCompanySchema } from './company.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('companies')
export class CompanyController {
  constructor(private readonly svc: CompanyService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.COMPANY_VIEW)
  findAll() {
    return this.svc.findAll()
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.COMPANY_VIEW)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.COMPANY_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCompanySchema)) dto: z.infer<typeof UpdateCompanySchema>,
  ) {
    return this.svc.update(id, dto)
  }

  @Post(':id/test-hacienda')
  @RequirePermissions(PERMISSIONS.COMPANY_EDIT)
  testHacienda(
    @Param('id') id: string,
    @Body() body: { user?: string; password?: string; ambiente?: 'TEST' | 'PROD' },
  ) {
    return this.svc.testHaciendaConnection(id, body)
  }
}
