import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wheel Tracker',
  description: 'Track your options trading using the wheel strategy',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
