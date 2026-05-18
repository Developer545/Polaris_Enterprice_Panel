import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { BranchesService, CreateBranchSchema, UpdateBranchSchema } from './branches.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('branches')
export class BranchesController {
  constructor(private readonly svc: BranchesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.BRANCHES_VIEW)
  findAll(@Query('companyId') companyId?: string) {
    return this.svc.findAll(companyId)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.BRANCHES_VIEW)
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.BRANCHES_CREATE)
  create(@Body(new ZodValidationPipe(CreateBranchSchema)) dto: z.infer<typeof CreateBranchSchema>) {
    return this.svc.create(dto)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.BRANCHES_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateBranchSchema)) dto: z.infer<typeof UpdateBranchSchema>,
  ) {
    return this.svc.update(id, dto)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.BRANCHES_DELETE)
  remove(@Param('id') id: string) {
    return this.svc.remove(id)
  }
}
