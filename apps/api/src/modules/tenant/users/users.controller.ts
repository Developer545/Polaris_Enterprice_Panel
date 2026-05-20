import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { UsersService, CreateUserSchema, UpdateUserSchema } from './users.service'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { PERMISSIONS, type JwtAccessPayload } from '@pos-dte/shared-types'
import { z } from 'zod'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  findAll(@CurrentUser() user: JwtAccessPayload, @Query('companyId') companyId?: string) {
    return this.usersService.findAll(companyId ?? user.companyId, user)
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_VIEW)
  findOne(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.usersService.findOne(id, user)
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_CREATE)
  create(
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(CreateUserSchema)) dto: z.infer<typeof CreateUserSchema>,
  ) {
    return this.usersService.create(dto, user)
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.USERS_EDIT)
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: z.infer<typeof UpdateUserSchema>,
  ) {
    return this.usersService.update(id, dto, user)
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.USERS_DELETE)
  remove(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.usersService.remove(id, user)
  }
}
