const { defineConfig, devices } = require('@playwright/test');
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
    { command: 'yarn --cwd ../server start', port: 5000, reuseExistingServer: !process.env.CI, env: { GAME_STATE_FILE: '/tmp/chiffres-e2e-' + process.pid + '.json' } },
    { command: 'yarn --cwd ../client start', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI, env: { BROWSER: 'none', REACT_APP_API_URL: 'http://localhost:5000/api/game' }, timeout: 120000 }
  ]
});
