import type { Metadata } from 'next'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { SessionProvider } from '@/components/session-provider'
import { UserMenu } from '@/components/user-menu'
import { MainNav } from '@/components/navigation'
import './globals.css'

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
            <header className="bg-white shadow-sm sticky top-0 z-40">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center gap-8">
                    <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                      Wheel Tracker
                    </Link>
                    <MainNav />
                  </div>
                  <UserMenu user={session.user} />
                </div>
              </div>
            </header>
          )}
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
