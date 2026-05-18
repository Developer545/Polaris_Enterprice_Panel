import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { RolesService, CreateRoleSchema, UpdateRoleSchema } from './roles.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('roles')
export class RolesController {
  constructor(private readonly svc: RolesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ROLES_VIEW)
  findAll(@Query('companyId') companyId: string) {
    return this.svc.findAll(companyId)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ROLES_VIEW)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ROLES_CREATE)
  create(@Body(new ZodValidationPipe(CreateRoleSchema)) dto: z.infer<typeof CreateRoleSchema>) {
    return this.svc.create(dto)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.ROLES_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateRoleSchema)) dto: z.infer<typeof UpdateRoleSchema>,
  ) {
    return this.svc.update(id, dto)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.ROLES_DELETE)
  remove(@Param('id') id: string) {
    return this.svc.remove(id)
  }
}
