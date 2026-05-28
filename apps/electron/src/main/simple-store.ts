import { app } from 'electron'
import fs from 'fs'
import path from 'path'

type StoreOptions<T extends Record<string, unknown>> = {
  name: string
  defaults?: Partial<T>
}

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.')
  let cur: unknown = obj
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

function setNestedValue(obj: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split('.')
  let cur: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (cur[part] == null || typeof cur[part] !== 'object') {
      cur[part] = {}
    }
    cur = cur[part] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

export class SimpleStore<T extends Record<string, unknown> = Record<string, unknown>> {
  private readonly filePath: string
  private data: Record<string, unknown>

  constructor(options: StoreOptions<T>) {
    const userDataPath = app.getPath('userData')
    this.filePath = path.join(userDataPath, `${options.name}.json`)
    this.data = { ...(options.defaults ?? {}) }
    this.load()
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8')
        const parsed = JSON.parse(raw)
        this.data = { ...this.data, ...parsed }
      }
    } catch {
      // Keep defaults on corrupt file
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8')
    } catch (err: any) {
      console.error('[store] write failed:', err.message)
    }
  }

  get<V = unknown>(key: string): V | undefined {
    return getNestedValue(this.data, key) as V | undefined
  }

  set(key: string, value: unknown): void {
    setNestedValue(this.data, key, value)
    this.save()
  }

  delete(key: string): void {
    const parts = key.split('.')
    let cur: Record<string, unknown> = this.data
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (cur[part] == null || typeof cur[part] !== 'object') return
      cur = cur[part] as Record<string, unknown>
    }
    delete cur[parts[parts.length - 1]]
    this.save()
  }

  has(key: string): boolean {
    return getNestedValue(this.data, key) !== undefined
  }

  clear(): void {
    this.data = {}
    this.save()
  }
}
