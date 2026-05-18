import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      lib: { entry: 'src/main/index.ts' },
      rollupOptions: {
        external: ['serialport', 'node-thermal-printer', '@serialport/bindings-cpp'],
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
