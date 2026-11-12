import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  // 카메라는 HTTPS에서만 켜지므로 개발 서버를 임시 인증서로 연다
  plugins: [react(), tailwindcss(), basicSsl()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
