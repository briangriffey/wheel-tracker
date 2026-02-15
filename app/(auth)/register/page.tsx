'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { register } from '@/lib/actions/auth'
import { Button } from '@/components/design-system/button'
import { Input, InputGroup } from '@/components/design-system/input'
import { Alert, AlertDescription } from '@/components/design-system/alert'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/design-system/card'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await register(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/login?registered=true')
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
            <h2 className="text-2xl font-bold text-neutral-900 text-center">Create your account</h2>
            <p className="mt-1 text-center text-sm text-neutral-500">
              Or{' '}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                sign in to your existing account
              </Link>
            </p>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <Alert variant="error">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <InputGroup label="Name" htmlFor="name" required>
                <Input id="name" name="name" type="text" required placeholder="Your name" />
              </InputGroup>

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

              <InputGroup
                label="Password"
                htmlFor="password"
                required
                helpText="Must be at least 8 characters"
              >
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="Create a password"
                />
              </InputGroup>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t border-neutral-100 pt-6">
            <p className="text-sm text-neutral-500">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-neutral-400 mt-6">
          Free to start &middot; No credit card required
        </p>
      </div>
    </div>
  )
}
