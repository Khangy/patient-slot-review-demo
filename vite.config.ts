import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`          static site in dist/ (GitHub Pages, Vercel, any static host)
// `npm run build:single`   everything inlined into dist-single/index.html: opens from disk, can be emailed
// `npm run build:artifact` like single, with an in-memory router, for hosting as a claude.ai artifact
export default defineConfig(({ mode }) => {
  const inline = mode === 'single' || mode === 'artifact';
  return {
    base: './',
    plugins: inline ? [react(), viteSingleFile()] : [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      outDir: mode === 'single' ? 'dist-single' : mode === 'artifact' ? 'dist-artifact' : 'dist',
      chunkSizeWarningLimit: 2000,
    },
  };
});
