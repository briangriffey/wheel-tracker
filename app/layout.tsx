import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/providers/session-provider';
import { UserNav } from '@/components/user-nav';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Wheel Tracker',
  description: 'Track your wheel options trading strategies',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <div className="min-h-screen bg-gray-50">
            <header className="border-b bg-white">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
                <h1 className="text-2xl font-bold text-gray-900">Wheel Tracker</h1>
                <UserNav />
              </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
