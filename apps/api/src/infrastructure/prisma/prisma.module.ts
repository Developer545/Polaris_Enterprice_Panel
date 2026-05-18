import { Global, Module } from '@nestjs/common'
import { ControlPlaneClient } from './control-plane.client'
import { TenantClientFactory } from './tenant-client.factory'

@Global()
@Module({
  providers: [ControlPlaneClient, TenantClientFactory],
  exports: [ControlPlaneClient, TenantClientFactory],
})
export class PrismaModule {}
