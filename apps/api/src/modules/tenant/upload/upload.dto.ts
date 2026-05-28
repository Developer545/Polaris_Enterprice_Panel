import { z } from 'zod'

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp', 'image/gif']

export const UploadImageSchema = z.object({
  data:     z.string().min(1, 'Imagen requerida'),
  filename: z.string().min(1),
  mimeType: z.string().refine(v => ALLOWED_MIME.includes(v), 'Formato no permitido. Use PNG, JPG, SVG o WebP'),
  folder:   z.string().optional(),
})

export type UploadImageDto = z.infer<typeof UploadImageSchema>

export interface GalleryItem {
  publicId:  string
  url:       string
  fullUrl:   string
  bytes:     number
  folder:    string
  createdAt: string
}
