import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { BranchesService, CreateBranchSchema, UpdateBranchSchema } from './branches.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS, type JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('branches')
export class BranchesController {
  constructor(private readonly svc: BranchesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.BRANCHES_VIEW)
  findAll(@CurrentUser() user: JwtAccessPayload, @Query('companyId') companyId?: string) {
    return this.svc.findAll(user, companyId)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.BRANCHES_VIEW)
  findOne(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.svc.findOne(id, user)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.BRANCHES_CREATE)
  create(
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(CreateBranchSchema)) dto: z.infer<typeof CreateBranchSchema>,
  ) {
    return this.svc.create(dto, user)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.BRANCHES_EDIT)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(UpdateBranchSchema)) dto: z.infer<typeof UpdateBranchSchema>,
  ) {
    return this.svc.update(id, dto, user)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.BRANCHES_DELETE)
  remove(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.svc.remove(id, user)
  }
}
