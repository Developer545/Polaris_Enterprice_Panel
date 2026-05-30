import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { ClientsService, CreateClientSchema, UpdateClientSchema } from './clients.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS, type JwtAccessPayload } from '@pos-dte/shared-types'
import { RequireModule } from '../../../common/decorators/tenant-module.decorator'
import { RequireLocalModule } from '../../../common/decorators/local-module.decorator'
import { z } from 'zod'

@RequireModule('clientes')
@RequireLocalModule('clientes')
@Controller('clients')
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CLIENTS_VIEW)
  findAll(
    @CurrentUser() user: JwtAccessPayload,
    @Query('companyId') companyId: string,
    @Query('search') search?: string,
    @Query('branchId') branchId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll(companyId, user, search, branchId, page ? +page : 1, limit ? Math.min(+limit, 200) : 50)
  }

  @Get('consumidor-final')
  @RequirePermissions(PERMISSIONS.CLIENTS_VIEW)
  getConsumidorFinal(@CurrentUser() user: JwtAccessPayload, @Query('companyId') companyId: string) {
    return this.svc.getConsumidorFinal(companyId, user)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CLIENTS_VIEW)
  findOne(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.svc.findOne(id, user)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CLIENTS_CREATE)
  create(
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(CreateClientSchema)) dto: z.infer<typeof CreateClientSchema>,
  ) {
    return this.svc.create(dto, user)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.CLIENTS_EDIT)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(UpdateClientSchema)) dto: z.infer<typeof UpdateClientSchema>,
  ) {
    return this.svc.update(id, dto, user)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.CLIENTS_DELETE)
  remove(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.svc.remove(id, user)
  }
}
