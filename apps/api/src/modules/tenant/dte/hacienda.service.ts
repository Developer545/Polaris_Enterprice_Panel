/**
 * Handles Hacienda API authentication and DTE document submission.
 * Endpoints: TEST = api.dtes.sv/api, PROD = api.dtes.sv/api
 * Auth: POST /fe/autenticacion — returns token (valid 24h)
 * Reception: POST /fe/recepciondte — submits signed JWS
 * Consult: POST /fe/consultadte
 */
import { Injectable, Logger } from '@nestjs/common'
import Axios, { AxiosError } from 'axios'
import { getDteVersion, isTipoDte } from '@pos-dte/dte-core'

const ENDPOINTS = {
  TEST: 'https://apitest.dtes.mh.gob.sv/fesv',
  PROD: 'https://api.dtes.mh.gob.sv/fesv',
} as const

export interface HaciendaToken {
  token: string
  expiresAt: Date
}

export interface HaciendaSubmitResult {
  selloRecibido: string | null
  observaciones: string[]
  estado?: string
  raw?: unknown
}

@Injectable()
export class HaciendaService {
  private readonly logger = new Logger(HaciendaService.name)
  // In-memory token cache per tenant+company (cleared on restart)
  private readonly tokenCache = new Map<string, HaciendaToken>()

  async authenticate(user: string, password: string, ambiente: 'TEST' | 'PROD', cacheKey: string): Promise<string> {
    const cached = this.tokenCache.get(cacheKey)
    if (cached && cached.expiresAt > new Date()) return cached.token

    const base = ENDPOINTS[ambiente]
    const res = await Axios.post(`${base}/seguridad/auth`, null, {
      params: { user, pwd: password },
      timeout: 15_000,
    })

    const token: string = res.data?.body?.token
    if (!token) throw new Error('Hacienda no retornó token')

    // Tokens are valid ~24h — cache for 23h to be safe
    this.tokenCache.set(cacheKey, {
      token,
      expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000),
    })

    return token
  }

  async submitDte(
    jwsToken: string,
    tipoDte: string,
    codigoGeneracion: string,
    ambiente: 'TEST' | 'PROD',
    authToken: string,
  ): Promise<HaciendaSubmitResult> {
    const base = ENDPOINTS[ambiente]

    const body = {
      ambiente: ambiente === 'PROD' ? '01' : '00',
      idEnvio: 1,
      version: this.getVersion(tipoDte),
      tipoDte,
      documento: jwsToken,
      codigoGeneracion,
    }

    const res = await Axios.post(`${base}/recepciondte`, body, {
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    })

    const { estado, selloRecibido, observaciones } = res.data ?? {}
    return {
      selloRecibido: selloRecibido ?? null,
      observaciones: observaciones ?? [],
      estado,
      raw: res.data,
    }
  }

  async submitInvalidacion(
    jwsToken: string,
    codigoGeneracion: string,
    ambiente: 'TEST' | 'PROD',
    authToken: string,
  ): Promise<HaciendaSubmitResult> {
    const base = ENDPOINTS[ambiente]

    const body = {
      ambiente: ambiente === 'PROD' ? '01' : '00',
      idEnvio: 1,
      version: 3,
      documento: jwsToken,
      codigoGeneracion,
    }

    const res = await Axios.post(`${base}/anulardte`, body, {
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    })

    const { selloRecibido, observaciones } = res.data ?? {}
    return {
      selloRecibido: selloRecibido ?? null,
      observaciones: observaciones ?? [],
      raw: res.data,
    }
  }

  async submitContingencia(
    jwsToken: string,
    codigoGeneracion: string,
    ambiente: 'TEST' | 'PROD',
    authToken: string,
  ): Promise<HaciendaSubmitResult> {
    const base = ENDPOINTS[ambiente]

    const body = {
      ambiente: ambiente === 'PROD' ? '01' : '00',
      idEnvio: 1,
      version: 4,
      documento: jwsToken,
      codigoGeneracion,
    }

    const res = await Axios.post(`${base}/contingencia`, body, {
      headers: {
        Authorization: authToken,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    })

    const { estado, selloRecibido, observaciones } = res.data ?? {}
    return {
      selloRecibido: selloRecibido ?? null,
      observaciones: observaciones ?? [],
      estado,
      raw: res.data,
    }
  }

  async consultarDte(
    codigoGeneracion: string,
    ambiente: 'TEST' | 'PROD',
    authToken: string,
  ): Promise<any> {
    const base = ENDPOINTS[ambiente]
    const res = await Axios.post(`${base}/consultadte`, { codigoGeneracion }, {
      headers: { Authorization: authToken },
      timeout: 15_000,
    })
    return res.data
  }

  private getVersion(tipoDte: string): number {
    if (!isTipoDte(tipoDte)) throw new Error(`Tipo DTE no soportado: ${tipoDte}`)
    return getDteVersion(tipoDte)
  }

  invalidateToken(cacheKey: string) {
    this.tokenCache.delete(cacheKey)
  }

  isConnectivityError(error: unknown): boolean {
    const err = error as AxiosError
    if (!Axios.isAxiosError(err)) return false

    if (!err.response) return true
    return (err.response.status ?? 0) >= 500
  }
}
