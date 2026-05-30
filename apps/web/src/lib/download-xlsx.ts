/**
 * downloadXlsx
 * Fetches an xlsx report from the API and triggers a browser download.
 */
import { api } from './api'

export async function downloadXlsx(
  endpoint: string,
  filename: string,
  params?: Record<string, any>,
): Promise<void> {
  const response = await api.get(endpoint, {
    params,
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
