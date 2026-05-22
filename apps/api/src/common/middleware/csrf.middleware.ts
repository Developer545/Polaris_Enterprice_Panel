import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common'
import { getEnv } from '../../config/env'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly allowedOrigins: Set<string>

  constructor() {
    this.allowedOrigins = new Set(
      getEnv().CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    )
  }

  use(req: any, _res: any, next: () => void): void {
    if (SAFE_METHODS.has(req.method)) return next()

    const origin = req.headers['origin'] as string | undefined

    // Sin Origin: petición server-to-server o misma pestaña — permitir
    if (!origin) return next()

    if (!this.allowedOrigins.has(origin)) {
      throw new ForbiddenException(`Origen no permitido: ${origin}`)
    }

    next()
  }
}
