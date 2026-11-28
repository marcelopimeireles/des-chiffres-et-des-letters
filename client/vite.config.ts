import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      'process.env.REACT_APP_API_URL': JSON.stringify(env.REACT_APP_API_URL || 'http://localhost:5000/api/game'),
      'process.env.REACT_APP_RIVE_GAME_SRC': JSON.stringify(env.REACT_APP_RIVE_GAME_SRC || ''),
      'process.env.REACT_APP_RIVE_STUDIO_SRC': JSON.stringify(env.REACT_APP_RIVE_STUDIO_SRC || '')
    },
    server: {
      port: 3000,
      proxy: { '/api': 'http://localhost:5000' }
    },
    build: { outDir: 'build' }
  };
});
