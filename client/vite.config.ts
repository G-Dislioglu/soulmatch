import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';

const clientPkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

export default defineConfig({
  plugins: [react()],
  define: {
    __CLIENT_VERSION__: JSON.stringify(clientPkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@modules': path.resolve(__dirname, 'src/modules'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/scheduler') ||
            id.includes('node_modules/wouter') ||
            id.includes('node_modules/use-sync-external-store') ||
            id.includes('node_modules/regexparam')
          ) return 'vendor-react';
          if (id.includes('node_modules')) return 'vendor';
          if (id.includes('/modules/M05_numerology/')) return 'mod-numerology';
          if (id.includes('/modules/M04_astrology-adapter/')) return 'mod-astrology';
          if (id.includes('/modules/M07_reports/') || id.includes('/modules/M11_match/')) return 'mod-reports';
          if (id.includes('/modules/M08_studio-chat/') || id.includes('/modules/M13_timeline/') || id.includes('/modules/M14_guide/')) return 'mod-studio';
        },
      },
    },
  },
});
