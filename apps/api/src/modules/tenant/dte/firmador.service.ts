import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { importPKCS8, SignJWT } from 'jose'
import * as forge from 'node-forge'

/**
 * DTE Digital Signing Service
 *
 * Format: JWS Compact Serialization (RFC 7515)
 * Algorithm: RS256 (RSA-PKCS#1 v1.5 with SHA-256)
 * Header: { alg: "RS256", x5c: [base64DerCert] }
 *
 * Flow:
 *  1. Receive .p12 buffer + password
 *  2. Extract RSA private key (PEM) + certificate (DER base64)
 *  3. Sign DTE JSON → produce JWS string
 *
 * Note: The .p12 is stored AES-256 encrypted in Company.certDataEnc
 * and decrypted by EncryptionService before calling this service.
 */
@Injectable()
export class FirmadorService {
  private readonly logger = new Logger(FirmadorService.name)

  /**
   * Sign a DTE JSON document and return the JWS compact string.
   *
   * @param dteJson   - The complete DTE JSON object (will NOT be modified after signing)
   * @param p12Base64 - Base64-encoded .p12 certificate file
   * @param p12Pwd    - Certificate password
   */
  async firmarDocumento(
    dteJson: Record<string, unknown>,
    p12Base64: string,
    p12Pwd: string,
  ): Promise<string> {
    const { privateKeyPem, certDerBase64 } = this.extractFromP12(p12Base64, p12Pwd)

    const privateKey = await importPKCS8(privateKeyPem, 'RS256')

    const jws = await new SignJWT(dteJson)
      .setProtectedHeader({ alg: 'RS256', x5c: [certDerBase64] })
      .sign(privateKey)

    this.logger.debug(`DTE firmado: ${(dteJson as any).identificacion?.codigoGeneracion}`)
    return jws
  }

  private extractFromP12(
    p12Base64: string,
    password: string,
  ): { privateKeyPem: string; certDerBase64: string } {
    try {
      const p12Der = forge.util.decode64(p12Base64)
      const p12Asn1 = forge.asn1.fromDer(p12Der)
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password)

      // Extract private key
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
      if (!keyBag?.key) throw new Error('No se encontró clave privada en el certificado')

      const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key)

      // Extract certificate
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
      const certBag = certBags[forge.pki.oids.certBag]?.[0]
      if (!certBag?.cert) throw new Error('No se encontró certificado en el archivo .p12')

      const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certBag.cert)).getBytes()
      const certDerBase64 = forge.util.encode64(certDer)

      return { privateKeyPem, certDerBase64 }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      this.logger.error(`Error extrayendo .p12: ${message}`)
      throw new BadRequestException(`Error al procesar certificado: ${message}`)
    }
  }
}
