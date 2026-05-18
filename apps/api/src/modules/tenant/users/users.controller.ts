import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { UsersService, CreateUserSchema, UpdateUserSchema } from './users.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  findAll(@Query('companyId') companyId: string) {
    return this.usersService.findAll(companyId)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_CREATE)
  create(@Body(new ZodValidationPipe(CreateUserSchema)) dto: z.infer<typeof CreateUserSchema>) {
    return this.usersService.create(dto)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.USERS_EDIT)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: z.infer<typeof UpdateUserSchema>,
  ) {
    return this.usersService.update(id, dto)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.USERS_DELETE)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id)
  }
}
