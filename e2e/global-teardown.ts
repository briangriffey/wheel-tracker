import { cleanupAllTestData, disconnectTestDb } from './helpers/db'

async function globalTeardown() {
  console.log('🧹 Cleaning up E2E test environment...')

  try {
    await cleanupAllTestData()
    console.log('✅ Test data cleaned up')
  } catch (error) {
    console.error('⚠️  Failed to clean up test data:', error)
  }

  try {
    await disconnectTestDb()
    console.log('✅ Database connection closed')
  } catch (error) {
    console.error('⚠️  Failed to disconnect from database:', error)
  }

  console.log('✅ E2E test cleanup complete')
}

export default globalTeardown
