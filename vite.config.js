import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Las pruebas (y el globalSetup, que corre fuera de Vite) leen las variables de .env.local.
Object.assign(process.env, loadEnv('test', process.cwd(), 'VITE_'));

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unitarias',
          environment: 'jsdom',
          include: ['pruebas/unitarias/**/*.test.{js,jsx}'],
          setupFiles: ['pruebas/unitarias/configuracion.js'],
          // Pocos procesos a la vez: con el proyecto en /mnt/c (WSL) arrancar muchos juntos supera
          // el tiempo de espera fijo de Vitest para iniciar un proceso.
          maxWorkers: 4,
        },
      },
      {
        extends: true,
        test: {
          name: 'integracion',
          environment: 'node',
          include: ['pruebas/integracion/**/*.test.js'],
          globalSetup: ['pruebas/integracion/configuracionGlobal.js'],
          fileParallelism: false,
          testTimeout: 30000,
          hookTimeout: 30000,
        },
      },
    ],
  },
});
