import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 60000,
  expect: { timeout: 20000 },
  globalSetup: './e2e/setup/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    storageState: 'e2e/.auth/user.json',
    actionTimeout: 20000,
    navigationTimeout: 30000,
  },
  webServer: [
    {
      command: 'pnpm --filter @voiler/api dev',
      url: 'http://localhost:4000/health',
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
    },
    {
      command: 'pnpm --filter @voiler/web dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
    },
  ],
})
