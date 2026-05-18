import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { PrismaClient } from '@pos-dte/db/control-plane'

// This client connects to the CONTROL_PLANE_DATABASE_URL
// It manages: tenants, plans, admin users

@Injectable()
export class ControlPlaneClient extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ControlPlaneClient.name)

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
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
