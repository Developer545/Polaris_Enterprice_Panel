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

    // Browser cookie mutations must include Origin; server-to-server calls without cookies may continue.
    if (!origin) {
      if (req.headers['cookie']) throw new ForbiddenException('Origen requerido para mutaciones autenticadas')
      return next()
    }

    if (!this.allowedOrigins.has(origin)) {
      throw new ForbiddenException(`Origen no permitido: ${origin}`)
    }

    next()
  }
}
