import { Module } from '@nestjs/common'
import { CatalogsAdminController } from './catalogs-admin.controller'
import { CatalogsAdminService } from './catalogs-admin.service'

@Module({
  controllers: [CatalogsAdminController],
  providers: [CatalogsAdminService],
})
export class CatalogsAdminModule {}
