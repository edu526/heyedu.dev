import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          pdf: ['@imggion/html2realpdf'],
          xml: ['fast-xml-parser'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    // ponytail: SharedArrayBuffer (requerido por WASM) necesita headers cross-origin
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    // ponytail: html2realpdf usa WASM y un Web Worker; pre-bundle para que Vite lo resuelva bien
    exclude: ['@imggion/html2realpdf'],
  },
  worker: {
    format: 'es',
  },
});

