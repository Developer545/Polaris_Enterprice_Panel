; uninstall-cleanup.nsh — solo incluido en electron-builder.local.yml
; Elimina local-server.json del AppData al desinstalar Polaris Local.
; Garantiza que el wizard aparezca en la próxima instalación.
; ${PRODUCT_NAME} resuelve a "Polaris Local" en tiempo de compilación NSIS.

!macro customUnInstall
  Delete "$APPDATA\${PRODUCT_NAME}\local-server.json"
!macroend
