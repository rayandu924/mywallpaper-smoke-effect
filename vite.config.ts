import { defineConfig, type Plugin } from 'vite'
import { copyFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

/** Copy manifest.json to dist/ after build */
function copyManifest(): Plugin {
  return {
    name: 'copy-manifest',
    closeBundle() {
      mkdirSync('dist', { recursive: true })
      copyFileSync('manifest.json', 'dist/manifest.json')
    },
  }
}

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', '@mywallpaper/sdk-react'],
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  plugins: [copyManifest()],
})
