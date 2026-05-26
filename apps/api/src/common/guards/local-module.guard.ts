/**
 * local-module.guard.ts
 * ──────────────────────
 * Guard para la versión desktop (IS_LOCAL_BUNDLE=1).
 *
 * Lee el archivo de permisos JSON escrito por el proceso Electron principal
 * (ruta en env var LOCAL_PERMISSIONS_FILE) y bloquea endpoints de módulos
 * premium que no estén habilitados para la licencia activa.
 *
 * Si no es modo local, el guard deja pasar todo (los tenants cloud usan
 * TenantModuleGuard en su lugar).
 */

import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { LOCAL_MODULE_KEY } from '../decorators/local-module.decorator'
import fs from 'fs'

type PermissionsFile = {
  enabledModules: string[]
  signature:      string
  validatedAt:    string
  expiresAt:      string | null
  plan:           string
  hwid:           string
}

const GRACE_DAYS   = 30
const BASE_MODULES = ['pos', 'ventas', 'clientes', 'inventario', 'servicios']

function readLocalPermissions(): PermissionsFile | null {
  const filePath = process.env.LOCAL_PERMISSIONS_FILE
  if (!filePath) return null
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as PermissionsFile
  } catch {
    return null
  }
}

function ageInDays(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / 86_400_000
}

function getActiveModules(): string[] {
  const perms = readLocalPermissions()
  if (!perms) return BASE_MODULES  // sin archivo → solo módulos base
  if (ageInDays(perms.validatedAt) >= GRACE_DAYS) {
    // Cache expirado — modo degradado
    return BASE_MODULES
  }
  return perms.enabledModules
}

@Injectable()
export class LocalModuleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    // Solo activo en modo bundle local
    if (process.env.IS_LOCAL_BUNDLE !== '1') return true

    const requiredModule = this.reflector.getAllAndOverride<string>(LOCAL_MODULE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ])

    // Sin @RequireLocalModule → permitir
    if (!requiredModule) return true

    const enabled = getActiveModules()
    if (!enabled.includes(requiredModule)) {
      throw new ForbiddenException(
        `El módulo "${requiredModule}" no está habilitado en su licencia. ` +
        `Contacte a soporte para activar este módulo.`,
      )
    }

    return true
  }
}
