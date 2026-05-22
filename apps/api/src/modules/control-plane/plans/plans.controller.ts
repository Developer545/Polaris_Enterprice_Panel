import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common'
import { PlansService, CreatePlanSchema, type CreatePlanDto } from './plans.service'
import { AdminJwtGuard } from '../../../common/guards/admin-jwt.guard'
import { AdminRolesGuard } from '../../../common/guards/admin-roles.guard'
import { AdminRoute } from '../../../common/decorators/admin.decorator'
import { RequireAdminRoles } from '../../../common/decorators/admin-roles.decorator'
import { Public } from '../../../common/decorators/public.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'

@Controller('control-plane/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Public()
  @Get()
  findAll() {
    return this.plansService.findAll()
  }

  @AdminRoute()
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @RequireAdminRoles('SUPER_ADMIN')
  @Post()
  create(@Body(new ZodValidationPipe(CreatePlanSchema)) dto: CreatePlanDto) {
    return this.plansService.create(dto)
  }

  @AdminRoute()
  @UseGuards(AdminJwtGuard, AdminRolesGuard)
  @RequireAdminRoles('SUPER_ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreatePlanDto>) {
    return this.plansService.update(id, dto)
  }
}
