import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const reply = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Error interno del servidor'
    let errors: unknown = undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const response = exception.getResponse()
      message = typeof response === 'string' ? response : (response as any).message ?? message
      errors = typeof response === 'object' ? (response as any).errors : undefined
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST
      message = 'Error de validación'
      errors = exception.flatten().fieldErrors
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack)
    }

    reply.status(status).send({
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
