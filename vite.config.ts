import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/chronicle-of-crashes/',
  plugins: [react()],
});

