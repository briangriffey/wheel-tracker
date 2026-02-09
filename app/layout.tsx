import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { SessionProvider } from '@/components/session-provider'
import { ToastProvider } from '@/components/toast-provider'
import { UserMenu } from '@/components/user-menu'
import './globals.css'
import './design-system.css'

export const metadata: Metadata = {
  title: 'Wheel Tracker',
  description: 'Track your options trading using the wheel strategy',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>
          {session?.user && (
            <header className="bg-white shadow-sm">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center gap-8">
                    <Link href="/dashboard" className="text-xl font-bold text-neutral-900">
                      Wheel Tracker
                    </Link>
                    <nav className="hidden md:flex gap-6">
                      <Link href="/dashboard" className="text-sm text-neutral-700 hover:text-neutral-900">
                        Dashboard
                      </Link>
                      <Link href="/wheels" className="text-sm text-neutral-700 hover:text-neutral-900">
                        Wheels
                      </Link>
                      <Link href="/trades" className="text-sm text-neutral-700 hover:text-neutral-900">
                        Trades
                      </Link>
                      <Link href="/positions" className="text-sm text-neutral-700 hover:text-neutral-900">
                        Positions
                      </Link>
                      <Link href="/help" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Help
                      </Link>
                    </nav>
                  </div>
                  <UserMenu user={session.user} />
                </div>
              </div>
            </header>
          )}
          {children}
        </SessionProvider>
        <ToastProvider />
      </body>
    </html>
  )
}
