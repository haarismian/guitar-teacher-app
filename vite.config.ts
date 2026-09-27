import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works on GitHub Pages under /guitar-teacher-app/
export default defineConfig({
  base: './',
  plugins: [react()],
});
