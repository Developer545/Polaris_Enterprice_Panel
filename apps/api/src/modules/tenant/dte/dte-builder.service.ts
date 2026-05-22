/**
 * Builds the DTE JSON structure (identificacion, emisor, receptor, cuerpoDocumento, resumen)
 * from a Sale + Company + Branch data, ready for signing.
 */
import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { Decimal } from '@prisma/client/runtime/library'
import { CATALOGO_FORMA_PAGO, CATALOGO_CONDICION_OPERACION } from '@pos-dte/shared-types'

@Injectable()
export class DteBuilderService {
  buildCF(sale: any, company: any, branch: any, client: any, numeroControl: string, codigoGeneracion: string): object {
    const now = new Date()
    return {
      identificacion: {
        version: 1,
        ambiente: company.dteAmbiente === 'PROD' ? '01' : '00',
        tipoDte: '01',
        numeroControl,
        codigoGeneracion,
        tipoModelo: 1,
        tipoOperacion: 1,
        tipoContingencia: null,
        motivoContin: null,
        fecEmi: now.toISOString().split('T')[0],
        horEmi: now.toISOString().split('T')[1].substring(0, 8),
        tipoMoneda: 'USD',
      },
      documentoRelacionado: null,
      emisor: this.buildEmisor(company, branch),
      receptor: this.buildReceptorCF(client),
      otrosDocumentos: null,
      ventaTercero: null,
      cuerpoDocumento: sale.items.map((item: any, i: number) => ({
        numItem: i + 1,
        tipoItem: parseInt(item.tipoItem),
        numeroDocumento: null,
        cantidad: Number(item.quantity),
        codigo: item.product?.sku ?? null,
        codTributo: null,
        uniMedida: item.uniMedida,
        descripcion: item.productName,
        precioUni: Number(item.unitPrice),
        montoDescu: Number(item.discount),
        ventaNoSuj: Number(item.ventaNoSuj),
        ventaExenta: Number(item.ventaExenta),
        ventaGravada: Number(item.ventaGravada),
        tributos: null,
        psv: 0,
        noGravado: 0,
        ivaItem: Number(item.ivaItem),
      })),
      resumen: this.buildResumenCF(sale),
      extension: null,
      apendice: null,
    }
  }

  buildCCF(sale: any, company: any, branch: any, client: any, numeroControl: string, codigoGeneracion: string): object {
    const now = new Date()
    return {
      identificacion: {
        version: 3,
        ambiente: company.dteAmbiente === 'PROD' ? '01' : '00',
        tipoDte: '03',
        numeroControl,
        codigoGeneracion,
        tipoModelo: 1,
        tipoOperacion: 1,
        tipoContingencia: null,
        motivoContin: null,
        fecEmi: now.toISOString().split('T')[0],
        horEmi: now.toISOString().split('T')[1].substring(0, 8),
        tipoMoneda: 'USD',
      },
      documentoRelacionado: null,
      emisor: this.buildEmisor(company, branch),
      receptor: this.buildReceptorCCF(client),
      otrosDocumentos: null,
      ventaTercero: null,
      cuerpoDocumento: sale.items.map((item: any, i: number) => ({
        numItem: i + 1,
        tipoItem: parseInt(item.tipoItem),
        numeroDocumento: null,
        cantidad: Number(item.quantity),
        codigo: item.product?.sku ?? null,
        codTributo: null,
        uniMedida: item.uniMedida,
        descripcion: item.productName,
        precioUni: Number(item.unitPrice),
        montoDescu: Number(item.discount),
        ventaNoSuj: Number(item.ventaNoSuj),
        ventaExenta: Number(item.ventaExenta),
        ventaGravada: Number(item.ventaGravada),
        tributos: [{ codigo: '20', descripcion: 'IVA 13%', valor: Number(item.ivaItem) }],
        psv: 0,
        noGravado: 0,
      })),
      resumen: this.buildResumenCCF(sale),
      extension: null,
      apendice: null,
    }
  }

  buildNC(
    sale: any,
    company: any,
    branch: any,
    client: any,
    originalDte: any,
    numeroControl: string,
    codigoGeneracion: string,
  ): object {
    const now = new Date()
    const tipoDteOriginal = originalDte.tipoDte
    return {
      identificacion: {
        version: 1,
        ambiente: company.dteAmbiente === 'PROD' ? '01' : '00',
        tipoDte: '05',
        numeroControl,
        codigoGeneracion,
        tipoModelo: 1,
        tipoOperacion: 1,
        tipoContingencia: null,
        motivoContin: null,
        fecEmi: now.toISOString().split('T')[0],
        horEmi: now.toISOString().split('T')[1].substring(0, 8),
        tipoMoneda: 'USD',
      },
      documentoRelacionado: [{
        tipoDocumento: tipoDteOriginal,
        tipoGeneracion: 1,
        numeroDocumento: originalDte.codigoGeneracion,
        fechaEmision: originalDte.createdAt?.toISOString().split('T')[0],
      }],
      emisor: this.buildEmisor(company, branch),
      receptor: tipoDteOriginal === '03' ? this.buildReceptorCCF(client) : this.buildReceptorCF(client),
      cuerpoDocumento: sale.items.map((item: any, i: number) => ({
        numItem: i + 1,
        tipoItem: parseInt(item.tipoItem),
        numeroDocumento: null,
        cantidad: Number(item.quantity),
        codigo: item.product?.sku ?? null,
        uniMedida: item.uniMedida,
        descripcion: item.productName,
        precioUni: Number(item.unitPrice),
        montoDescu: Number(item.discount),
        ventaNoSuj: Number(item.ventaNoSuj),
        ventaExenta: Number(item.ventaExenta),
        ventaGravada: Number(item.ventaGravada),
        ivaItem: Number(item.ivaItem),
      })),
      resumen: this.buildResumenCF(sale), // NC uses same structure as CF
      extension: null,
      apendice: null,
    }
  }

  private buildEmisor(company: any, branch: any) {
    return {
      nit: company.nit,
      nrc: company.nrc,
      nombre: company.name,
      codActividad: company.actividadEconomicaCodigo,
      descActividad: company.actividadEconomica,
      nombreComercial: company.comercialName ?? null,
      tipoEstablecimiento: '02',
      direccion: {
        departamento: '06',
        municipio: '14',
        complemento: company.address ?? '',
      },
      telefono: company.phone ?? '',
      correo: company.email ?? '',
      codEstableMH: branch.codEstableMH,
      codEstable: branch.codEstableMH,
      codPuntoVentaMH: branch.codPuntoVentaMH,
      codPuntoVenta: branch.codPuntoVentaMH,
    }
  }

  private buildReceptorCF(client: any) {
    // Consumidor final anónimo: receptor null (fe-fc-v1.json lo permite)
    if (!client) return null
    return {
      tipoDocumento: client.tipoDocumento ?? '13',
      numDocumento: client.numDocumento ?? null,
      nrc: client.nrc ?? null,
      nombre: client.name ?? null,
      codActividad: client.actividadEconomicaCodigo ?? null,
      descActividad: client.actividadEconomica ?? null,
      direccion: client.address
        ? { departamento: client.departamento ?? null, municipio: client.municipio ?? null, complemento: client.address }
        : null,
      telefono: client.phone ?? null,
      correo: client.email ?? null,
    }
  }

  private buildReceptorCCF(client: any) {
    return {
      nit: client.tipoDocumento === '36' ? client.numDocumento : null,
      nrc: client.nrc ?? null,
      nombre: client.name,
      codActividad: client.actividadEconomicaCodigo ?? null,
      descActividad: client.actividadEconomica ?? null,
      direccion: {
        departamento: '06',
        municipio: '14',
        complemento: client.address ?? '',
      },
      telefono: client.phone ?? '',
      correo: client.email ?? '',
    }
  }

  private buildResumenCF(sale: any) {
    const payments = (sale.payments ?? []).map((p: any) => ({
      codigo: p.formaPago,
      montoPago: Number(p.amount),
      referencia: p.reference ?? null,
      plazo: null,
      periodo: null,
    }))

    return {
      totalNoSuj: Number(sale.totalNoSuj),
      totalExenta: Number(sale.totalExenta),
      totalGravada: Number(sale.totalGravada),
      subTotalVentas: Number(sale.totalGravada) + Number(sale.totalExenta) + Number(sale.totalNoSuj),
      descuNoSuj: 0,
      descuExenta: 0,
      descuGravada: Number(sale.totalDescuento),
      porcentajeDescuento: 0,
      totalDescu: Number(sale.totalDescuento),
      // Factura CF: IVA va en totalIva, no en tributos (fe-fc-v1.json)
      tributos: null,
      subTotal: Number(sale.totalGravada) + Number(sale.totalExenta) + Number(sale.totalNoSuj) - Number(sale.totalDescuento),
      ivaRete1: 0,
      reteRenta: 0,
      montoTotalOperacion: Number(sale.totalPagar),
      totalNoGravado: 0,
      totalPagar: Number(sale.totalPagar),
      totalLetras: this.numberToWords(Number(sale.totalPagar)),
      totalIva: Number(sale.totalIva),
      saldoFavor: 0,
      condicionOperacion: parseInt(sale.condicionOperacion),
      pagos: payments,
      numPagoElectronico: null,
    }
  }

  private buildResumenCCF(sale: any) {
    const base = this.buildResumenCF(sale)
    return {
      ...base,
      subTotal: Number(sale.totalGravada) - Number(sale.totalDescuento),
      ivaPerci1: 0,
      ivaRete1: 0,
    }
  }

  generateCodigoGeneracion(): string {
    return randomUUID().toUpperCase()
  }

  private numberToWords(n: number): string {
    // Simplified — production should use a full conversion library
    const whole = Math.floor(n)
    const cents = Math.round((n - whole) * 100)
    return `${whole} DOLARES CON ${cents.toString().padStart(2, '0')}/100`
  }
}
