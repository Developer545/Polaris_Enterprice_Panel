import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { RolesService, CreateRoleSchema, UpdateRoleSchema } from './roles.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS, type JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('roles')
export class RolesController {
  constructor(private readonly svc: RolesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ROLES_VIEW)
  findAll(@CurrentUser() user: JwtAccessPayload, @Query('companyId') companyId: string) {
    return this.svc.findAll(companyId, user)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ROLES_VIEW)
  findOne(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.svc.findOne(id, user)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ROLES_CREATE)
  create(
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(CreateRoleSchema)) dto: z.infer<typeof CreateRoleSchema>,
  ) {
    return this.svc.create(dto, user)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.ROLES_EDIT)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(UpdateRoleSchema)) dto: z.infer<typeof UpdateRoleSchema>,
  ) {
    return this.svc.update(id, dto, user)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.ROLES_DELETE)
  remove(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.svc.remove(id, user)
  }
}
