import { defineConfig } from 'vite';
// Relative base so the build works on GitHub Pages under /<repo>/ and when opened locally.
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 1500 } });
