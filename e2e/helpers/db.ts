import { PrismaClient } from '@/lib/generated/prisma'
import bcrypt from 'bcryptjs'

// Use a separate Prisma client instance for E2E tests
export const testDb = new PrismaClient()

/**
 * Test user credentials
 */
export const TEST_USERS = {
  default: {
    name: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123!',
  },
  secondary: {
    name: 'Secondary User',
    email: 'test2@example.com',
    password: 'TestPassword123!',
  },
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  userData = TEST_USERS.default
): Promise<{ id: string; email: string; name: string }> {
  const hashedPassword = await bcrypt.hash(userData.password, 10)

  const user = await testDb.user.create({
    data: {
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
    },
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? '',
  }
}

/**
 * Delete all test users and their related data
 */
export async function cleanupTestUsers() {
  // Delete in order to respect foreign key constraints
  await testDb.benchmark.deleteMany()
  await testDb.marketBenchmark.deleteMany()
  await testDb.stockPrice.deleteMany()
  await testDb.trade.deleteMany()
  await testDb.position.deleteMany()
  await testDb.account.deleteMany()
  await testDb.session.deleteMany()
  await testDb.verificationToken.deleteMany()
  await testDb.user.deleteMany({
    where: {
      email: {
        in: Object.values(TEST_USERS).map((u) => u.email),
      },
    },
  })
}

/**
 * Clean up all test data (use with caution!)
 */
export async function cleanupAllTestData() {
  await cleanupTestUsers()
}

/**
 * Disconnect from the database
 */
export async function disconnectTestDb() {
  await testDb.$disconnect()
}
