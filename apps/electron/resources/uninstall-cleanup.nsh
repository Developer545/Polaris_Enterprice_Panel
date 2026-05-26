; uninstall-cleanup.nsh
; Elimina local-server.json del AppData al desinstalar Polaris.
; Esto garantiza que el wizard de configuración aparezca en la próxima instalación.

!macro customUnInstall
  Delete "$APPDATA\Polaris\local-server.json"
!macroend
