'use server'

import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { signIn } from '@/lib/auth'

const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export async function register(formData: FormData) {
  const parsed = RegisterSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return {
      error: 'Invalid input',
      details: parsed.error.flatten().fieldErrors,
    }
  }

  const { name, email, password } = parsed.data

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return {
      error: 'User with this email already exists',
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Create user
  try {
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    })

    return { success: true }
  } catch {
    return {
      error: 'Failed to create user',
    }
  }
}

export async function loginAction(formData: FormData) {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return {
      error: 'Invalid input',
      details: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    })

    return { success: true }
  } catch {
    return {
      error: 'Invalid email or password',
    }
  }
}
