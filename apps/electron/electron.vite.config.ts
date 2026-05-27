import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    ssr: {
      noExternal: [
        'electron-updater',
        'electron-log',
        'pg',
        'node-thermal-printer',
      ],
    },
    build: {
      outDir: 'dist/main',
      lib: { entry: 'src/main/index.ts' },
      rollupOptions: {
        external: ['electron', 'serialport', '@serialport/bindings-cpp'],
      },
    },
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      lib: { entry: 'src/preload/index.ts' },
    },
  },
  // No renderer — loads cloud URL
})
