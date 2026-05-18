import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { ClientsService, CreateClientSchema, UpdateClientSchema } from './clients.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('clients')
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CLIENTS_VIEW)
  findAll(@Query('companyId') companyId: string, @Query('search') search?: string) {
    return this.svc.findAll(companyId, search)
  }

  @Get('consumidor-final')
  @RequirePermissions(PERMISSIONS.CLIENTS_VIEW)
  getConsumidorFinal(@Query('companyId') companyId: string) {
    return this.svc.getConsumidorFinal(companyId)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CLIENTS_VIEW)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CLIENTS_CREATE)
  create(@Body(new ZodValidationPipe(CreateClientSchema)) dto: z.infer<typeof CreateClientSchema>) {
    return this.svc.create(dto)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.CLIENTS_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateClientSchema)) dto: z.infer<typeof UpdateClientSchema>,
  ) {
    return this.svc.update(id, dto)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.CLIENTS_DELETE)
  remove(@Param('id') id: string) {
    return this.svc.remove(id)
  }
}
