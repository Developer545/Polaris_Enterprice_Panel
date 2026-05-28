import { Injectable, BadRequestException } from '@nestjs/common'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs/promises'
import { UploadImageDto, GalleryItem } from './upload.dto'

@Injectable()
export class UploadService {

  async uploadImage(dto: UploadImageDto): Promise<string> {
    // Validate size — base64 inflates ~33%, so 10 MB binary ≈ 13.5 MB base64
    const binaryBytes = Math.floor((dto.data.length * 3) / 4)
    if (binaryBytes > 10 * 1024 * 1024) {
      throw new BadRequestException('La imagen no puede superar 10 MB')
    }

    if (process.env.IS_LOCAL_BUNDLE === '1') {
      return this.saveLocal(dto)
    }
    return this.uploadToCloudinary(dto)
  }

  private async saveLocal(dto: UploadImageDto): Promise<string> {
    const baseDir = process.env.IMAGES_BASE_DIR
    if (!baseDir) throw new BadRequestException('Carpeta de imágenes no configurada. Configúrala en Ajustes.')

    const uploadDir = path.join(baseDir, 'imagenes_polaris')
    await fs.mkdir(uploadDir, { recursive: true })

    const rawExt = dto.filename.split('.').pop()?.toLowerCase() ?? 'jpg'
    const safeExt = ['jpg', 'jpeg', 'png', 'svg', 'gif', 'webp'].includes(rawExt) ? rawExt : 'jpg'
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`
    const filePath = path.join(uploadDir, uniqueName)

    const buffer = Buffer.from(dto.data, 'base64')
    await fs.writeFile(filePath, buffer)

    return `local-image:${uniqueName}`
  }

  private async uploadToCloudinary(dto: UploadImageDto): Promise<string> {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey    = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException('Cloudinary no configurado. Contacta al administrador.')
    }

    const folder    = dto.folder ?? 'polaris/productos'
    const timestamp = Math.round(Date.now() / 1000)
    const paramStr  = `folder=${folder}&timestamp=${timestamp}`
    const signature = crypto.createHash('sha256').update(paramStr + apiSecret).digest('hex')

    const buffer   = Buffer.from(dto.data, 'base64')
    const blob     = new Blob([buffer], { type: dto.mimeType })
    const formData = new FormData()
    formData.append('file', blob, dto.filename)
    formData.append('api_key', apiKey)
    formData.append('timestamp', String(timestamp))
    formData.append('signature', signature)
    formData.append('folder', folder)

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json() as Record<string, any>
      throw new BadRequestException((err?.error as any)?.message ?? 'Error subiendo imagen a Cloudinary')
    }

    const data = await res.json() as Record<string, any>
    return (data.secure_url as string).replace('/upload/', '/upload/q_auto,f_auto/')
  }

  async getGallery(folder?: string): Promise<GalleryItem[]> {
    if (process.env.IS_LOCAL_BUNDLE === '1') {
      return this.getLocalGallery()
    }
    return this.getCloudinaryGallery(folder)
  }

  private async getLocalGallery(): Promise<GalleryItem[]> {
    const baseDir = process.env.IMAGES_BASE_DIR
    if (!baseDir) return []

    const uploadDir = path.join(baseDir, 'imagenes_polaris')
    try { await fs.access(uploadDir) } catch { return [] }

    const files = await fs.readdir(uploadDir)
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|svg|gif|webp)$/i.test(f))

    const items: GalleryItem[] = []
    for (const f of imageFiles) {
      const stat = await fs.stat(path.join(uploadDir, f)).catch(() => null)
      items.push({
        publicId:  f,
        url:       `local-image:${f}`,
        fullUrl:   `local-image:${f}`,
        bytes:     stat?.size ?? 0,
        folder:    'local',
        createdAt: stat?.mtime.toISOString() ?? new Date().toISOString(),
      })
    }

    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  private async getCloudinaryGallery(folder?: string): Promise<GalleryItem[]> {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey    = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) return []

    const searchFolder = folder ?? 'polaris'
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        expression: `folder:${searchFolder}*`,
        max_results: 100,
        sort_by: [{ created_at: 'desc' }],
      }),
    })

    if (!res.ok) return []
    const data = await res.json() as Record<string, any>

    return ((data.resources ?? []) as any[]).map(r => ({
      publicId:  r.public_id as string,
      url:       (r.secure_url as string).replace('/upload/', '/upload/q_auto,f_auto,w_400/'),
      fullUrl:   (r.secure_url as string).replace('/upload/', '/upload/q_auto,f_auto/'),
      bytes:     r.bytes as number,
      folder:    r.folder ?? '',
      createdAt: r.created_at as string,
    }))
  }
}
