import { defineConfig } from 'vite';

// Simple single-app config. GLSL is imported as raw strings via `?raw`.
export default defineConfig({
  base: '/',
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
});
