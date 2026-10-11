import { defineConfig, devices } from '@playwright/test';

// Las pruebas crean usuarios de prueba con la clave publishable de .env.local.
try {
  process.loadEnvFile('.env.local');
} catch {
  // Sin .env.local las pruebas fallan al crear el cliente con un mensaje claro.
}

export default defineConfig({
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'es-AR',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60000,
  },
  projects: [
    {
      name: 'e2e',
      testDir: 'pruebas/e2e',
      use: { ...devices['Desktop Chrome'], locale: 'es-AR' },
    },
    {
      name: 'rendimiento',
      testDir: 'pruebas/rendimiento',
      timeout: 30 * 60 * 1000,
      use: { ...devices['Desktop Chrome'], locale: 'es-AR' },
    },
  ],
});
