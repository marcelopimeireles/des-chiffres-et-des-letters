const { defineConfig, devices } = require('@playwright/test');
const os = require('node:os');
const path = require('node:path');

const gameStateFile = path.join(os.tmpdir(), `chiffres-e2e-${process.pid}.json`);
module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ],
  webServer: [
    { command: 'yarn --cwd ../server start', port: 5000, reuseExistingServer: !process.env.CI, env: { GAME_STATE_FILE: gameStateFile } },
    { command: 'yarn --cwd ../client start --host 0.0.0.0', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI, env: { VITE_API_URL: 'http://localhost:5000/api/game' }, timeout: 120000 }
  ]
});
