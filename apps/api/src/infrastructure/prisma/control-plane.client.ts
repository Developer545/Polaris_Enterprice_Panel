import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { PrismaClient } from '@pos-dte/db/control-plane'

// This client connects to the CONTROL_PLANE_DATABASE_URL
// It manages: tenants, plans, admin users

const KEEP_ALIVE_MS = 4 * 60 * 1000

@Injectable()
export class ControlPlaneClient extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ControlPlaneClient.name)
  private keepAliveTimer?: NodeJS.Timeout

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      datasources: {
        db: { url: process.env.CONTROL_PLANE_DATABASE_URL },
      },
    })
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
    this.logger.log('Control Plane DB connected')
    this.keepAliveTimer = setInterval(async () => {
      try {
        await this.$queryRaw`SELECT 1`
      } catch (err) {
        this.logger.warn(`Control Plane keep-alive failed: ${err}`)
      }
    }, KEEP_ALIVE_MS)
  }

  async onModuleDestroy(): Promise<void> {
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer)
    await this.$disconnect()
  }
}
