import { Injectable } from '@nestjs/common'
import { randomUUID } from 'crypto'
import {
  assertContingencyBatchSize,
  CONTINGENCY_EVENT_VERSION,
  RETORNO_EVENT_VERSION,
  OPERACION_ESPECIAL_EVENT_VERSION,
  getDteVersion,
} from '@pos-dte/dte-core'

type GeoAddress = {
  departamento: string
  municipio: string
  distrito: string
  complemento: string
}

type ContingenciaParams = {
  tipoContingencia: number   // CAT-005: 1-5
  motivoContin: string
}

@Injectable()
export class DteBuilderService {
  buildCF(sale: any, company: any, branch: any, client: any, numeroControl: string, codigoGeneracion: string, contingencia?: ContingenciaParams): object {
    const now = this.svDateTime()

    return {
      identificacion: {
        version: getDteVersion('01'),
        ambiente: company.dteAmbiente === 'PROD' ? '01' : '00',
        tipoDte: '01',
        numeroControl,
        codigoGeneracion,
        tipoModelo: contingencia ? 2 : 1,
        tipoOperacion: contingencia ? 2 : 1,
        tipoContingencia: contingencia?.tipoContingencia ?? null,
        motivoContin: contingencia?.motivoContin ?? null,
        fecEmi: now.date,
        horEmi: now.time,
        tipoMoneda: 'USD',
      },
      documentoRelacionado: null,
      emisor: this.buildEmisor(company, branch),
      receptor: this.buildReceptorCF(client),
      otrosDocumentos: null,
      ventaTercero: null,
      cuerpoDocumento: sale.items.map((item: any, i: number) => ({
        numItem: i + 1,
        tipoItem: Number.parseInt(item.tipoItem, 10),
        numeroDocumento: null,
        cantidad: Number(item.quantity),
        codigo: item.product?.sku ?? null,
        codTributo: null,
        uniMedida: Number(item.uniMedida),
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
      apendice: null,
    }
  }

  buildCCF(sale: any, company: any, branch: any, client: any, numeroControl: string, codigoGeneracion: string, contingencia?: ContingenciaParams): object {
    const now = this.svDateTime()

    return {
      identificacion: {
        version: getDteVersion('03'),
        ambiente: company.dteAmbiente === 'PROD' ? '01' : '00',
        tipoDte: '03',
        numeroControl,
        codigoGeneracion,
        tipoModelo: contingencia ? 2 : 1,
        tipoOperacion: contingencia ? 2 : 1,
        tipoContingencia: contingencia?.tipoContingencia ?? null,
        motivoContin: contingencia?.motivoContin ?? null,
        fecEmi: now.date,
        horEmi: now.time,
        tipoMoneda: 'USD',
      },
      documentoRelacionado: null,
      emisor: this.buildEmisor(company, branch),
      receptor: this.buildReceptorCCF(client),
      otrosDocumentos: null,
      ventaTercero: null,
      cuerpoDocumento: sale.items.map((item: any, i: number) => ({
        numItem: i + 1,
        tipoItem: Number.parseInt(item.tipoItem, 10),
        numeroDocumento: null,
        cantidad: Number(item.quantity),
        codigo: item.product?.sku ?? null,
        codTributo: null,
        uniMedida: Number(item.uniMedida),
        descripcion: item.productName,
        precioUni: Number(item.unitPrice),
        montoDescu: Number(item.discount),
        ventaNoSuj: Number(item.ventaNoSuj),
        ventaExenta: Number(item.ventaExenta),
        ventaGravada: Number(item.ventaGravada),
        tributos: Number(item.ventaGravada) > 0 ? ['20'] : null,
        psv: 0,
        noGravado: 0,
      })),
      resumen: this.buildResumenCCF(sale),
      apendice: null,
    }
  }

  buildNC(sale: any, company: any, branch: any, client: any, numeroControl: string, codigoGeneracion: string, contingencia?: ContingenciaParams): object {
    const now = this.svDateTime()

    const docRel = sale.docRelTipoDte ? [{
      tipoDte: sale.docRelTipoDte,
      tipoGeneracion: sale.docRelTipoGeneracion ?? 1,
      numeroControl: sale.docRelNumeroControl,
      codigoGeneracion: sale.docRelCodigoGeneracion,
    }] : null

    return {
      identificacion: {
        version: getDteVersion('05'),
        ambiente: company.dteAmbiente === 'PROD' ? '01' : '00',
        tipoDte: '05',
        numeroControl,
        codigoGeneracion,
        tipoModelo: contingencia ? 2 : 1,
        tipoOperacion: contingencia ? 2 : 1,
        tipoContingencia: contingencia?.tipoContingencia ?? null,
        motivoContin: contingencia?.motivoContin ?? null,
        fecEmi: now.date,
        horEmi: now.time,
        tipoMoneda: 'USD',
      },
      documentoRelacionado: docRel,
      emisor: this.buildEmisor(company, branch),
      receptor: this.buildReceptorCCF(client),
      otrosDocumentos: null,
      ventaTercero: null,
      cuerpoDocumento: sale.items.map((item: any, i: number) => ({
        numItem: i + 1,
        tipoItem: Number.parseInt(item.tipoItem, 10),
        numeroDocumento: null,
        cantidad: Number(item.quantity),
        codigo: item.product?.sku ?? null,
        codTributo: null,
        uniMedida: Number(item.uniMedida),
        descripcion: item.productName,
        precioUni: Number(item.unitPrice),
        montoDescu: Number(item.discount),
        ventaNoSuj: Number(item.ventaNoSuj),
        ventaExenta: Number(item.ventaExenta),
        ventaGravada: Number(item.ventaGravada),
        tributos: Number(item.ventaGravada) > 0 ? ['20'] : null,
        psv: 0,
        noGravado: 0,
      })),
      resumen: this.buildResumenNC(sale),
      apendice: null,
    }
  }

  buildND(sale: any, company: any, branch: any, client: any, numeroControl: string, codigoGeneracion: string, contingencia?: ContingenciaParams): object {
    const now = this.svDateTime()

    const docRel = sale.docRelTipoDte ? [{
      tipoDte: sale.docRelTipoDte,
      tipoGeneracion: sale.docRelTipoGeneracion ?? 1,
      numeroControl: sale.docRelNumeroControl,
      codigoGeneracion: sale.docRelCodigoGeneracion,
    }] : null

    return {
      identificacion: {
        version: getDteVersion('06'),
        ambiente: company.dteAmbiente === 'PROD' ? '01' : '00',
        tipoDte: '06',
        numeroControl,
        codigoGeneracion,
        tipoModelo: contingencia ? 2 : 1,
        tipoOperacion: contingencia ? 2 : 1,
        tipoContingencia: contingencia?.tipoContingencia ?? null,
        motivoContin: contingencia?.motivoContin ?? null,
        fecEmi: now.date,
        horEmi: now.time,
        tipoMoneda: 'USD',
      },
      documentoRelacionado: docRel,
      emisor: this.buildEmisor(company, branch),
      receptor: this.buildReceptorCCF(client),
      otrosDocumentos: null,
      ventaTercero: null,
      cuerpoDocumento: sale.items.map((item: any, i: number) => ({
        numItem: i + 1,
        tipoItem: Number.parseInt(item.tipoItem, 10),
        numeroDocumento: null,
        cantidad: Number(item.quantity),
        codigo: item.product?.sku ?? null,
        codTributo: null,
        uniMedida: Number(item.uniMedida),
        descripcion: item.productName,
        precioUni: Number(item.unitPrice),
        montoDescu: Number(item.discount),
        ventaNoSuj: Number(item.ventaNoSuj),
        ventaExenta: Number(item.ventaExenta),
        ventaGravada: Number(item.ventaGravada),
        tributos: Number(item.ventaGravada) > 0 ? ['20'] : null,
        psv: 0,
        noGravado: 0,
      })),
      resumen: this.buildResumenCCF(sale),
      apendice: null,
    }
  }

  /**
   * Venta Simplificada (tipo 16 provisional) — receptor siempre anónimo (null).
   * Estructura idéntica a CF pero sin datos del receptor.
   * Código de tipo actualizable mediante VENTA_SIMPLIFICADA_TIPO_DTE en shared-types.
   */
  buildVS(sale: any, company: any, branch: any, numeroControl: string, codigoGeneracion: string, contingencia?: ContingenciaParams): object {
    const now = this.svDateTime()

    return {
      identificacion: {
        version: getDteVersion('16'),
        ambiente: company.dteAmbiente === 'PROD' ? '01' : '00',
        tipoDte: '16',
        numeroControl,
        codigoGeneracion,
        tipoModelo: contingencia ? 2 : 1,
        tipoOperacion: contingencia ? 2 : 1,
        tipoContingencia: contingencia?.tipoContingencia ?? null,
        motivoContin: contingencia?.motivoContin ?? null,
        fecEmi: now.date,
        horEmi: now.time,
        tipoMoneda: 'USD',
      },
      documentoRelacionado: null,
      emisor: this.buildEmisor(company, branch),
      receptor: null, // VS siempre anónimo
      otrosDocumentos: null,
      ventaTercero: null,
      cuerpoDocumento: sale.items.map((item: any, i: number) => ({
        numItem: i + 1,
        tipoItem: Number.parseInt(item.tipoItem, 10),
        numeroDocumento: null,
        cantidad: Number(item.quantity),
        codigo: item.product?.sku ?? null,
        codTributo: null,
        uniMedida: Number(item.uniMedida),
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
      apendice: null,
    }
  }

  /**
   * Evento de Retorno (Tipo 18) — DTE 2.0 — vigencia dic 2026
   * Submitted to POST /fesv/eventosdte with tipoEvento: '18'
   */
  buildRetornoEvent(params: {
    company: any
    branch: any
    codigoGeneracion: string
    dteDocument: {
      tipoDte: string
      codigoGeneracion: string
      selloRecibido: string | null
      numeroControl: string
      fecEmi: string
    }
    motivo: string
    nombreResponsable: string
    tipoDocResponsable: string
    numDocResponsable: string
    nombreSolicita: string
    tipoDocSolicita: string
    numDocSolicita: string
    items: Array<{
      tipoItem: number
      descripcion: string
      cantidad: number
      uniMedida: number
      precioUni: number
      montoDescu: number
      ventaNoSuj: number
      ventaExenta: number
      ventaGravada: number
    }>
    resumen: {
      totalNoSuj: number
      totalExenta: number
      totalGravada: number
      totalIva: number
      totalDescuento: number
      totalPagar: number
    }
  }): object {
    const now = this.svDateTime()

    return {
      identificacion: {
        version: RETORNO_EVENT_VERSION,
        ambiente: params.company.dteAmbiente === 'PROD' ? '01' : '00',
        codigoGeneracion: params.codigoGeneracion,
        fTransmision: now.date,
        hTransmision: now.time,
      },
      emisor: {
        nit: this.required(params.company.nit, 'NIT del emisor'),
        nombre: this.required(params.company.name, 'nombre del emisor'),
        nombreResponsable: params.nombreResponsable,
        tipoDocResponsable: params.tipoDocResponsable,
        numeroDocResponsable: params.numDocResponsable,
        tipoEstablecimiento: params.branch.tipoEstablecimiento ?? '02',
        codEstableMH: this.required(params.branch.codEstableMH, 'codigo de establecimiento MH'),
        codPuntoVentaMH: this.required(params.branch.codPuntoVentaMH, 'codigo de punto de venta MH'),
        telefono: params.company.phone ?? '',
        correo: this.required(params.company.email, 'correo del emisor'),
      },
      documentoRelacionado: {
        tipoDte: params.dteDocument.tipoDte,
        codigoGeneracion: params.dteDocument.codigoGeneracion,
        selloRecibido: params.dteDocument.selloRecibido,
        numeroControl: params.dteDocument.numeroControl,
        fecEmi: params.dteDocument.fecEmi,
      },
      motivo: {
        motivo: params.motivo,
        nombreResponsable: params.nombreResponsable,
        tipoDocResponsable: params.tipoDocResponsable,
        numDocResponsable: params.numDocResponsable,
        nombreSolicita: params.nombreSolicita,
        tipoDocSolicita: params.tipoDocSolicita,
        numDocSolicita: params.numDocSolicita,
      },
      detalle: params.items.map((item, index) => ({
        noItem: index + 1,
        tipoItem: item.tipoItem,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        uniMedida: item.uniMedida,
        precioUni: item.precioUni,
        montoDescu: item.montoDescu,
        ventaNoSuj: item.ventaNoSuj,
        ventaExenta: item.ventaExenta,
        ventaGravada: item.ventaGravada,
        tributos: item.ventaGravada > 0 ? ['20'] : null,
        noGravado: 0,
      })),
      resumen: {
        totalNoSuj: params.resumen.totalNoSuj,
        totalExenta: params.resumen.totalExenta,
        totalGravada: params.resumen.totalGravada,
        totalIva: params.resumen.totalIva,
        totalDescuento: params.resumen.totalDescuento,
        totalPagar: params.resumen.totalPagar,
      },
    }
  }

  /**
   * Evento de Operaciones Especiales (Tipo 17) — DTE 2.0 — vigencia dic 2026
   * Submitted to POST /fesv/eventosdte with tipoEvento: '17'
   * Covers: anticipos, permutas, retiro de bienes, dación en pago, autoconsumo
   */
  buildOperacionEspecialEvent(params: {
    company: any
    branch: any
    codigoGeneracion: string
    dteDocument: {
      tipoDte: string
      codigoGeneracion: string
      selloRecibido: string | null
      numeroControl: string
      fecEmi: string
    }
    tipoOperacion: string        // CAT-022
    motivo: string
    nombreResponsable: string
    tipoDocResponsable: string
    numDocResponsable: string
    nombreSolicita: string
    tipoDocSolicita: string
    numDocSolicita: string
    items: Array<{
      tipoItem: number
      descripcion: string
      cantidad: number
      uniMedida: number
      precioUni: number
      montoDescu: number
      ventaNoSuj: number
      ventaExenta: number
      ventaGravada: number
    }>
    resumen: {
      totalNoSuj: number
      totalExenta: number
      totalGravada: number
      totalIva: number
      totalDescuento: number
      totalPagar: number
    }
  }): object {
    const now = this.svDateTime()

    return {
      identificacion: {
        version: OPERACION_ESPECIAL_EVENT_VERSION,
        ambiente: params.company.dteAmbiente === 'PROD' ? '01' : '00',
        codigoGeneracion: params.codigoGeneracion,
        fTransmision: now.date,
        hTransmision: now.time,
      },
      emisor: {
        nit: this.required(params.company.nit, 'NIT del emisor'),
        nombre: this.required(params.company.name, 'nombre del emisor'),
        nombreResponsable: params.nombreResponsable,
        tipoDocResponsable: params.tipoDocResponsable,
        numeroDocResponsable: params.numDocResponsable,
        tipoEstablecimiento: params.branch.tipoEstablecimiento ?? '02',
        codEstableMH: this.required(params.branch.codEstableMH, 'codigo de establecimiento MH'),
        codPuntoVentaMH: this.required(params.branch.codPuntoVentaMH, 'codigo de punto de venta MH'),
        telefono: params.company.phone ?? '',
        correo: this.required(params.company.email, 'correo del emisor'),
      },
      documentoRelacionado: {
        tipoDte: params.dteDocument.tipoDte,
        codigoGeneracion: params.dteDocument.codigoGeneracion,
        selloRecibido: params.dteDocument.selloRecibido,
        numeroControl: params.dteDocument.numeroControl,
        fecEmi: params.dteDocument.fecEmi,
      },
      motivo: {
        tipoOperacion: params.tipoOperacion,
        descripcionOperacion: params.motivo,
        nombreResponsable: params.nombreResponsable,
        tipoDocResponsable: params.tipoDocResponsable,
        numDocResponsable: params.numDocResponsable,
        nombreSolicita: params.nombreSolicita,
        tipoDocSolicita: params.tipoDocSolicita,
        numDocSolicita: params.numDocSolicita,
      },
      detalle: params.items.map((item, index) => ({
        noItem: index + 1,
        tipoItem: item.tipoItem,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        uniMedida: item.uniMedida,
        precioUni: item.precioUni,
        montoDescu: item.montoDescu,
        ventaNoSuj: item.ventaNoSuj,
        ventaExenta: item.ventaExenta,
        ventaGravada: item.ventaGravada,
        tributos: item.ventaGravada > 0 ? ['20'] : null,
        noGravado: 0,
      })),
      resumen: {
        totalNoSuj: params.resumen.totalNoSuj,
        totalExenta: params.resumen.totalExenta,
        totalGravada: params.resumen.totalGravada,
        totalIva: params.resumen.totalIva,
        totalDescuento: params.resumen.totalDescuento,
        totalPagar: params.resumen.totalPagar,
      },
    }
  }

  buildContingenciaEvent(params: {
    company: any
    branch: any
    codigoGeneracion: string
    startedAt: Date
    endedAt: Date
    tipoContingencia: number
    motivoContingencia: string | null
    nombreResponsable: string
    tipoDocResponsable: string
    numeroDocResponsable: string
    documentos: Array<{ tipoDoc: string; codigoGeneracion: string }>
  }): object {
    assertContingencyBatchSize(params.documentos.length)
    const now = this.svDateTime()
    const start = this.svDateTime(params.startedAt)
    const end = this.svDateTime(params.endedAt)

    return {
      identificacion: {
        version: CONTINGENCY_EVENT_VERSION,
        ambiente: params.company.dteAmbiente === 'PROD' ? '01' : '00',
        codigoGeneracion: params.codigoGeneracion,
        fTransmision: now.date,
        hTransmision: now.time,
      },
      emisor: {
        nit: this.required(params.company.nit, 'NIT del emisor'),
        nombre: this.required(params.company.name, 'nombre del emisor'),
        nombreResponsable: params.nombreResponsable,
        tipoDocResponsable: params.tipoDocResponsable,
        numeroDocResponsable: params.numeroDocResponsable,
        tipoEstablecimiento: params.branch.tipoEstablecimiento ?? '02',
        codEstableMH: this.required(params.branch.codEstableMH, 'codigo de establecimiento MH'),
        codPuntoVentaMH: this.required(params.branch.codPuntoVentaMH, 'codigo de punto de venta MH'),
        telefono: params.company.phone ?? '',
        correo: this.required(params.company.email, 'correo del emisor'),
      },
      detalleDTE: params.documentos.map((doc, index) => ({
        noItem: index + 1,
        tipoDoc: doc.tipoDoc,
        codigoGeneracion: doc.codigoGeneracion,
      })),
      motivo: {
        fInicio: start.date,
        fFin: end.date,
        hInicio: start.time,
        hFin: end.time,
        tipoContingencia: params.tipoContingencia,
        motivoContingencia: params.motivoContingencia,
      },
    }
  }

  generateCodigoGeneracion(): string {
    return randomUUID().toUpperCase()
  }

  private buildEmisor(company: any, branch: any) {
    return {
      nit: this.required(company.nit, 'NIT del emisor'),
      nrc: this.required(company.nrc, 'NRC del emisor'),
      nombre: this.required(company.name, 'nombre del emisor'),
      codActividad: this.required(company.actividadEconomicaCodigo, 'actividad economica del emisor'),
      descActividad: this.required(company.actividadEconomica, 'descripcion de actividad economica del emisor'),
      nombreComercial: company.comercialName ?? null,
      giro: company.giro ?? null,
      direccion: this.buildEmisorAddress(company, branch),
      telefono: company.phone ?? '',
      correo: this.required(company.email, 'correo del emisor'),
      codEstable: this.required(branch.codEstableMH, 'codigo de establecimiento'),
      codPuntoVenta: this.required(branch.codPuntoVentaMH, 'codigo de punto de venta'),
    }
  }

  private buildReceptorCF(client: any) {
    if (!client) return null

    return {
      tipoDocumento: client.tipoDocumento ?? null,
      numDocumento: client.numDocumento ?? null,
      nrc: client.nrc ?? null,
      nombre: client.name ?? null,
      codActividad: client.actividadEconomicaCodigo ?? null,
      descActividad: client.actividadEconomica ?? null,
      direccion: this.tryBuildAddress(client),
      telefono: client.phone ?? null,
      correo: client.email ?? null,
    }
  }

  private buildReceptorCCF(client: any) {
    if (!client) throw new Error('El CCF requiere un receptor contribuyente')

    return {
      nit: this.required(client.numDocumento, 'NIT del receptor'),
      nrc: this.required(client.nrc, 'NRC del receptor'),
      nombre: this.required(client.name, 'nombre del receptor'),
      codActividad: this.required(client.actividadEconomicaCodigo, 'actividad economica del receptor'),
      descActividad: this.required(client.actividadEconomica, 'descripcion de actividad economica del receptor'),
      nombreComercial: client.comercialName ?? client.name,
      direccion: this.requiredAddress(client, 'direccion del receptor'),
      telefono: client.phone ?? '',
      correo: client.email ?? '',
    }
  }

  private buildResumenCF(sale: any) {
    const totalNoSuj = Number(sale.totalNoSuj)
    const totalExenta = Number(sale.totalExenta)
    const totalGravada = Number(sale.totalGravada)
    const totalIva = Number(sale.totalIva)
    const totalDescuento = Number(sale.totalDescuento)
    const ivaRete = Number(sale.ivaRete1 ?? 0)
    const reteRenta = Number(sale.reteRenta ?? 0)
    const subTotalVentas = totalGravada + totalExenta + totalNoSuj

    return {
      totalNoSuj,
      totalExenta,
      totalGravada,
      subTotalVentas,
      descuNoSuj: 0,
      descuExenta: 0,
      descuGravada: totalDescuento,
      porcentajeDescuento: 0,
      totalDescu: totalDescuento,
      tributos: null,
      subTotal: subTotalVentas,
      ivaRete,
      reteRenta: reteRenta > 0 ? reteRenta : undefined,
      montoTotalOperacion: Number(sale.totalPagar) + ivaRete,
      totalNoGravado: 0,
      totalPagar: Number(sale.totalPagar),
      totalLetras: this.numberToWords(Number(sale.totalPagar)),
      totalIva,
      saldoFavor: 0,
      condicionOperacion: Number.parseInt(sale.condicionOperacion, 10),
      pagos: this.buildPayments(sale),
      numPagoElectronico: null,
      observaciones: sale.notes ?? null,
    }
  }

  private buildResumenCCF(sale: any) {
    const totalNoSuj = Number(sale.totalNoSuj)
    const totalExenta = Number(sale.totalExenta)
    const totalGravada = Number(sale.totalGravada)
    const totalIva = Number(sale.totalIva)
    const totalDescuento = Number(sale.totalDescuento)
    const ivaRete = Number(sale.ivaRete1 ?? 0)
    const reteRenta = Number(sale.reteRenta ?? 0)
    const subTotalVentas = totalGravada + totalExenta + totalNoSuj

    return {
      totalNoSuj,
      totalExenta,
      totalGravada,
      subTotalVentas,
      descuNoSuj: 0,
      descuExenta: 0,
      descuGravada: totalDescuento,
      porcentajeDescuento: 0,
      totalDescu: totalDescuento,
      tributos: totalGravada > 0 ? [{ codigo: '20', descripcion: 'Impuesto al Valor Agregado 13%', valor: totalIva }] : null,
      subTotal: subTotalVentas,
      ivaPerci: 0,
      ivaRete,
      reteRenta: reteRenta > 0 ? reteRenta : undefined,
      montoTotalOperacion: subTotalVentas + totalIva,
      totalNoGravado: 0,
      totalPagar: Number(sale.totalPagar),
      totalLetras: this.numberToWords(Number(sale.totalPagar)),
      saldoFavor: 0,
      condicionOperacion: Number.parseInt(sale.condicionOperacion, 10),
      pagos: this.buildPayments(sale),
      numPagoElectronico: null,
      observaciones: sale.notes ?? null,
    }
  }

  private buildResumenNC(sale: any) {
    const totalNoSuj = Number(sale.totalNoSuj)
    const totalExenta = Number(sale.totalExenta)
    const totalGravada = Number(sale.totalGravada)
    const totalIva = Number(sale.totalIva)
    const subTotalVentas = totalGravada + totalExenta + totalNoSuj

    return {
      totalNoSuj,
      totalExenta,
      totalGravada,
      subTotalVentas,
      descuNoSuj: 0,
      descuExenta: 0,
      descuGravada: 0,
      porcentajeDescuento: 0,
      totalDescu: 0,
      tributos: totalGravada > 0 ? [{ codigo: '20', descripcion: 'Impuesto al Valor Agregado 13%', valor: totalIva }] : null,
      subTotal: subTotalVentas,
      ivaPerci: 0,
      ivaRete: 0,
      montoTotalOperacion: subTotalVentas,
      totalNoGravado: 0,
      totalPagar: Number(sale.totalPagar),
      totalLetras: this.numberToWords(Number(sale.totalPagar)),
      saldoFavor: 0,
      condicionOperacion: Number.parseInt(sale.condicionOperacion ?? '1', 10),
      pagos: null,
      numPagoElectronico: null,
      observaciones: sale.notes ?? null,
    }
  }

  private buildPayments(sale: any) {
    const payments = sale.payments ?? []
    if (payments.length === 0) {
      return [{
        codigo: '01',
        montoPago: Number(sale.totalPagar),
        referencia: null,
        plazo: null,
        periodo: null,
      }]
    }

    return payments.map((p: any) => ({
      codigo: p.formaPago,
      montoPago: Number(p.amount),
      referencia: p.reference ?? null,
      plazo: null,
      periodo: null,
    }))
  }

  private buildEmisorAddress(company: any, branch: any): GeoAddress {
    return this.requiredAddress({
      departamentoCod: branch.departamentoCod ?? company.departamentoCod,
      municipioCod: branch.municipioCod ?? company.municipioCod,
      distritoCod: branch.distritoCod ?? company.distritoCod,
      address: branch.address ?? company.address,
    }, 'direccion del emisor')
  }

  private tryBuildAddress(entity: any): GeoAddress | null {
    if (!entity?.address) return null
    if (!entity.departamentoCod || !entity.municipioCod || !entity.distritoCod) return null
    return this.requiredAddress(entity, 'direccion')
  }

  private requiredAddress(entity: any, label: string): GeoAddress {
    return {
      departamento: this.required(entity.departamentoCod, `${label}: departamento`),
      municipio: this.required(entity.municipioCod, `${label}: municipio`),
      distrito: this.required(entity.distritoCod, `${label}: distrito`),
      complemento: this.required(entity.address, `${label}: complemento`),
    }
  }

  private required(value: unknown, label: string): string {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
    throw new Error(`Falta configurar ${label} para emitir DTE`)
  }

  private svDateTime(value = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/El_Salvador',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }).formatToParts(value)

    const get = (type: string) => this.required(parts.find((part) => part.type === type)?.value, `fecha/hora ${type}`)
    return {
      date: `${get('year')}-${get('month')}-${get('day')}`,
      time: `${get('hour')}:${get('minute')}:${get('second')}`,
    }
  }

  private numberToWords(n: number): string {
    const whole = Math.floor(n)
    const cents = Math.round((n - whole) * 100)
    return `${whole} DOLARES CON ${cents.toString().padStart(2, '0')}/100`
  }
}
