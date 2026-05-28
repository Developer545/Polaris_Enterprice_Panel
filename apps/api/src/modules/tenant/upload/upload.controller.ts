import { Controller, Post, Get, Body, Query } from '@nestjs/common'
import { UploadService } from './upload.service'
import { UploadImageSchema, UploadImageDto } from './upload.dto'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { RequirePermissions } from '../../../common/decorators/permissions.decorator'
import { PERMISSIONS } from '@pos-dte/shared-types'

@Controller('upload')
export class UploadController {
  constructor(private readonly svc: UploadService) {}

  @Post('image')
  @RequirePermissions(PERMISSIONS.PRODUCTS_CREATE)
  async uploadImage(
    @Body(new ZodValidationPipe(UploadImageSchema)) dto: UploadImageDto,
  ) {
    const imageUrl = await this.svc.uploadImage(dto)
    return { imageUrl }
  }

  @Get('gallery')
  @RequirePermissions(PERMISSIONS.PRODUCTS_VIEW)
  async getGallery(@Query('folder') folder?: string) {
    const data = await this.svc.getGallery(folder)
    return { success: true, data, total: data.length }
  }
}
