import Link from 'next/link'
import { auth } from '@/lib/auth'

export default async function Home() {
  const session = await auth()

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Wheel Tracker</h1>
        <p className="text-lg text-gray-600 mb-8">
          Track your options trading using the wheel strategy
        </p>
        {!session ? (
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-gray-200 text-gray-900 font-medium rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
