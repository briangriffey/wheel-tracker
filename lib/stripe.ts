import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

function getStripe() {
  if (stripeInstance) return stripeInstance

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set. Stripe integration will not work.')
  }

  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
  })

  return stripeInstance
}

export const stripe = new Proxy({} as Stripe, {
  get(target, prop: string | symbol) {
    if (prop === '$$typeof' || prop === 'constructor' || prop === 'then' || typeof prop === 'symbol') {
      return Reflect.get(target, prop)
    }

    const instance = getStripe()
    const value = Reflect.get(instance, prop)
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(instance)
    }
    return value
  },
})

export const PLANS = {
  monthly: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID ?? '',
    amount: 300, // $3.00 in cents
    interval: 'month' as const,
  },
  annual: {
    priceId: process.env.STRIPE_ANNUAL_PRICE_ID ?? '',
    amount: 3000, // $30.00 in cents
    interval: 'year' as const,
  },
}
