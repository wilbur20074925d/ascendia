import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

/** MediaPipe packages reference source maps that are not shipped on npm. */
function stripMediapipeSourceMapRefs(): Plugin {
  return {
    name: 'strip-mediapipe-sourcemaps',
    enforce: 'pre',
    load(id) {
      const filePath = id.split('?')[0];
      if (!filePath.includes('@mediapipe/tasks-')) return null;
      if (!fs.existsSync(filePath)) return null;

      const code = fs.readFileSync(filePath, 'utf-8');
      if (!code.includes('sourceMappingURL')) return null;

      return code.replace(
        /\/\/[#@] sourceMappingURL=.*$|\/\*[#@] sourceMappingURL=.*?\*\//gm,
        '',
      );
    },
  };
}

export default defineConfig({
  base: '/mediapipe-samples-web/',

  plugins: [stripMediapipeSourceMapRefs()],
  optimizeDeps: {
    exclude: [
      '@mediapipe/tasks-vision',
      '@mediapipe/tasks-audio',
      '@mediapipe/tasks-text',
    ],
  },
  worker: {
    format: 'es',
  },
  build: {
    outDir: path.resolve(__dirname, '../mediapipe-samples-web'),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    port: 5174,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
