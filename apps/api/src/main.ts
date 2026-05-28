import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import { Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { getEnv } from './config/env'
import path from 'path'
import { mkdirSync } from 'fs'

async function bootstrap() {
  const env = getEnv()
  const logger = new Logger('Bootstrap')

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: env.NODE_ENV === 'development'
        ? { level: 'info', transport: { target: 'pino-pretty' } }
        : true,
    }),
  )

  // Cookies
  await app.register(fastifyCookie)

  // Local image serving — solo activo en Electron Local (IS_LOCAL_BUNDLE=1)
  if (env.IS_LOCAL_BUNDLE === '1' && env.IMAGES_BASE_DIR) {
    const imagesDir = path.join(env.IMAGES_BASE_DIR, 'imagenes_polaris')
    try { mkdirSync(imagesDir, { recursive: true }) } catch { /* ignore */ }
    await app.register(fastifyStatic, {
      root:           imagesDir,
      prefix:         '/local-images/',
      decorateReply:  false,
    })
  }

  // CORS
  app.enableCors({
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
  })

  // Global prefix
  app.setGlobalPrefix('api')

  // Health check
  const fastify = app.getHttpAdapter().getInstance()
  fastify.get('/api/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

  // Swagger (dev only)
  if (env.NODE_ENV === 'development') {
    const config = new DocumentBuilder()
      .setTitle('POS DTE API')
      .setDescription('API para POS DTE El Salvador — multi-tenant')
      .setVersion('1.0')
      .addCookieAuth('access_token')
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
    logger.log(`Swagger: http://localhost:${env.PORT}/api/docs`)
  }

  const host = env.IS_LOCAL_BUNDLE === '1' ? '127.0.0.1' : '0.0.0.0'
  await app.listen(env.PORT, host)
  logger.log(`🚀 API running on port ${env.PORT} [${env.NODE_ENV}]`)
}

bootstrap()
