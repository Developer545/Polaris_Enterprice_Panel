import { ipcMain, dialog, shell, BrowserWindow, app } from 'electron'
import fs from 'fs'
import path from 'path'

export type SavePdfPayload = {
  /** Base64-encoded PDF bytes */
  data: string
  /** Suggested file name, e.g. "factura-001.pdf" */
  defaultName: string
  /** Open file in default PDF viewer after saving. Default: true */
  openAfterSave?: boolean
}

export type SaveResult =
  | { ok: true; filePath: string }
  | { ok: false; cancelled?: boolean; error?: string }

export function setupDialogIpc(mainWindow: BrowserWindow): void {
  // ── Save PDF ───────────────────────────────────────────────────────────────
  ipcMain.handle('dialog:save-pdf', async (_e, payload: SavePdfPayload): Promise<SaveResult> => {
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar PDF',
      defaultPath: path.join(app.getPath('documents'), payload.defaultName),
      filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation'],
    })

    if (canceled || !filePath) return { ok: false, cancelled: true }

    try {
      const buffer = Buffer.from(payload.data, 'base64')
      fs.writeFileSync(filePath, buffer)
      if (payload.openAfterSave !== false) shell.openPath(filePath)
      return { ok: true, filePath }
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'Error al guardar PDF' }
    }
  })

  // ── Open file picker (for future Excel imports, etc.) ─────────────────────
  ipcMain.handle('dialog:open-file', async (_e, opts: {
    title?: string
    extensions?: string[]
    multiSelections?: boolean
  }) => {
    const { filePaths, canceled } = await dialog.showOpenDialog(mainWindow, {
      title: opts.title ?? 'Seleccionar archivo',
      filters: opts.extensions?.length
        ? [{ name: 'Archivos', extensions: opts.extensions }]
        : [{ name: 'Todos los archivos', extensions: ['*'] }],
      properties: [
        'openFile',
        ...(opts.multiSelections ? (['multiSelections'] as const) : []),
      ],
    })

    if (canceled || filePaths.length === 0) return { ok: false, cancelled: true, filePaths: [] }
    return { ok: true, filePaths }
  })

  // ── Show file in Explorer/Finder ──────────────────────────────────────────
  ipcMain.handle('dialog:show-in-folder', (_e, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}
