import { Module } from '@nestjs/common'
import { PayrollController } from './payroll.controller'
import { PayrollService } from './payroll.service'
import { PayrollPdfService } from './payroll-pdf.service'

@Module({
  controllers: [PayrollController],
  providers: [PayrollService, PayrollPdfService],
  exports: [PayrollService, PayrollPdfService],
})
export class PayrollModule {}
