import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig({
  base: process.env.BASE || '/',
  plugins: [
    react()
  ],
  server: {
    host: true,
    port: 9092
  },
  build: {
    rollupOptions: {
      // input: path.resolve(__dirname, 'index.html')
    }
  }
});
