'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { loginAction } from '@/lib/actions/auth'
import { Button } from '@/components/design-system/button'
import { Input, InputGroup } from '@/components/design-system/input'
import { Alert, AlertDescription } from '@/components/design-system/alert'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/design-system/card'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Account created successfully! Please sign in.')
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await loginAction(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center">
              <span className="text-white font-bold text-xl">&#920;</span>
            </div>
            <span className="text-2xl font-bold text-neutral-900">
              <span className="text-primary-600">Greek</span>Wheel
            </span>
          </Link>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <h2 className="text-2xl font-bold text-neutral-900 text-center">
              Sign in to your account
            </h2>
            <p className="mt-1 text-center text-sm text-neutral-500">
              Or{' '}
              <Link
                href="/register"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                create a new account
              </Link>
            </p>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              {successMessage && (
                <Alert variant="success">
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="error">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <InputGroup label="Email address" htmlFor="email" required>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </InputGroup>

              <InputGroup label="Password" htmlFor="password" required>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                />
              </InputGroup>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t border-neutral-100 pt-6">
            <p className="text-sm text-neutral-500">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Get started free
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
