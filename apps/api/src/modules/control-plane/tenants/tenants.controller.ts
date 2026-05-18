import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common'
import {
  TenantsService,
  CreateTenantSchema,
  UpdateTenantSchema,
  type CreateTenantDto,
  type UpdateTenantDto,
} from './tenants.service'
import { AdminJwtGuard } from '../../../common/guards/admin-jwt.guard'
import { AdminRoute } from '../../../common/decorators/admin.decorator'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'

@AdminRoute()
@UseGuards(AdminJwtGuard)
@Controller('control-plane/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  findAll() {
    return this.tenantsService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id)
  }

  @Post()
  create(@Body(new ZodValidationPipe(CreateTenantSchema)) dto: CreateTenantDto) {
    return this.tenantsService.create(dto)
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTenantSchema)) dto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, dto)
  }
}
