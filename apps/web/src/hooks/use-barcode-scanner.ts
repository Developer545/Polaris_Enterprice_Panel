import { useEffect, useRef, useCallback } from 'react'

export interface BarcodeScannerOptions {
  /** Max ms between keystrokes to be considered scanner input. Default: 50 */
  maxInterval?: number
  /** Minimum barcode length to trigger callback. Default: 3 */
  minLength?: number
  /** Ignore scans when focus is inside these element types. Default: ['INPUT', 'TEXTAREA'] */
  ignoreWhenFocusIn?: string[]
  /** Whether the hook is active. Default: true */
  enabled?: boolean
}

/**
 * Detects USB HID barcode scanner input (keyboard-wedge mode).
 *
 * Scanners send characters in rapid succession (< ~50ms each) followed by
 * Enter. This hook distinguishes scanner bursts from regular keyboard typing
 * and fires `onScan` with the accumulated barcode string.
 */
export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  options: BarcodeScannerOptions = {},
) {
  const {
    maxInterval = 50,
    minLength = 3,
    ignoreWhenFocusIn = ['INPUT', 'TEXTAREA'],
    enabled = true,
  } = options

  const bufferRef = useRef<string>('')
  const lastKeyTimeRef = useRef<number>(0)
  const onScanRef = useRef(onScan)

  // Keep callback ref fresh without re-registering listener
  useEffect(() => { onScanRef.current = onScan }, [onScan])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const now = Date.now()
    const interval = now - lastKeyTimeRef.current
    lastKeyTimeRef.current = now

    // Reset buffer if gap too long (human pause between keystrokes)
    if (interval > maxInterval * 4 && bufferRef.current.length > 0) {
      bufferRef.current = ''
    }

    if (e.key === 'Enter') {
      const barcode = bufferRef.current.trim()
      bufferRef.current = ''

      if (barcode.length < minLength) return

      // Only fire if the burst was fast enough to be a scanner
      // (interval check covers the last keystroke before Enter)
      if (interval <= maxInterval * 4) {
        // If an input is focused, only intercept if the scan came from outside
        // (i.e. interval is scanner-fast, not human-fast)
        const active = document.activeElement
        const tag = active?.tagName ?? ''
        if (ignoreWhenFocusIn.includes(tag) && interval > maxInterval) return

        e.preventDefault()
        onScanRef.current(barcode)
      }
      return
    }

    // Accumulate printable characters only
    if (e.key.length === 1) {
      // If interval is human-speed and no buffer, skip (not a scan)
      if (interval > maxInterval && bufferRef.current.length === 0) return
      bufferRef.current += e.key
    }
  }, [maxInterval, minLength, ignoreWhenFocusIn])

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}
