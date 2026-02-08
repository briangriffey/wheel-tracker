import { chromium, FullConfig } from '@playwright/test'
import { cleanupAllTestData } from './helpers/db'

async function globalSetup(config: FullConfig) {
  console.log('🧪 Setting up E2E test environment...')

  // Clean up any leftover test data from previous runs
  try {
    await cleanupAllTestData()
    console.log('✅ Test database cleaned')
  } catch (error) {
    console.error('⚠️  Failed to clean test database:', error)
  }

  // Verify that the app is running
  const baseURL = config.projects[0].use.baseURL
  if (!baseURL) {
    throw new Error('baseURL is not configured')
  }

  console.log(`🌐 Verifying app is running at ${baseURL}...`)

  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    await page.goto(baseURL, { timeout: 30000 })
    console.log('✅ App is running')
  } catch (error) {
    console.error('❌ Failed to connect to app:', error)
    throw new Error(
      `App is not running at ${baseURL}. Make sure to start the dev server first.`
    )
  } finally {
    await browser.close()
  }

  console.log('✅ E2E test environment ready')
}

export default globalSetup
