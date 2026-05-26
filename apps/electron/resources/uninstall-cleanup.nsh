; uninstall-cleanup.nsh — solo incluido en electron-builder.local.yml
; Elimina local-server.json del AppData al desinstalar Polaris Local.
; Garantiza que el wizard aparezca en la próxima instalación.
; ${PRODUCT_NAME} resuelve a "Polaris Local" en tiempo de compilación NSIS.

!macro customUnInstall
  ; Electron-builder genera userData como "@pos-dte\electron-local" para Polaris Local
  ; NO usar ${PRODUCT_NAME} — eso daría "Polaris Local" que no coincide con el path real
  Delete "$APPDATA\@pos-dte\electron-local\local-server.json"
!macroend
