import Link from 'next/link'
import { auth } from '@/lib/auth'
import { CheckCircle2 } from 'lucide-react'
import { PricingToggle } from '@/components/pricing/pricing-toggle'
import { FREE_TRADE_LIMIT } from '@/lib/constants'

export const metadata = {
  title: 'Pricing | GreekWheel',
  description: 'Simple, honest pricing for options wheel traders. Free to start, Pro for unlimited.',
}

const freeFeatures = [
  `${FREE_TRADE_LIMIT} trades (lifetime)`,
  'Full dashboard & P&L',
  'Greek calculations',
  'Wheel rotation tracking',
  'Benchmark comparisons',
  'Cash deposit tracking',
  'Trade history & export',
]

const proFeatures = [
  'Unlimited trades',
  'Everything in Free',
  'Priority support',
]

const faqs = [
  {
    question: 'What counts as a trade?',
    answer:
      'Every option opened or closed counts as one trade. Selling a cash-secured PUT, buying it back, selling a covered CALL, or rolling an option each count as separate trades. Positions, wheels, benchmarks, and deposits do not count.',
  },
  {
    question: 'What happens to my data if I cancel?',
    answer:
      'Everything stays. All your trades, positions, wheels, and analytics remain fully accessible. You just can\'t add new trades until you re-subscribe. Your data is never deleted.',
  },
  {
    question: 'Can I try Pro before paying?',
    answer:
      `The free tier IS the trial. Use all ${FREE_TRADE_LIMIT} trades to experience the full product — dashboard, Greeks, benchmarks, everything. When you're ready for more, upgrade.`,
  },
  {
    question: 'What if I need more trades but can\'t afford Pro?',
    answer:
      'Reach out to us. We want GreekWheel to work for everyone learning the wheel strategy. We\'ll figure something out.',
  },
  {
    question: 'Can I switch between monthly and annual?',
    answer:
      'Yes. You can switch plans anytime through the billing portal. If you switch from monthly to annual, you\'ll be prorated for the remaining time.',
  },
  {
    question: 'What happens if my payment fails?',
    answer:
      'You keep Pro access during a grace period while we retry the payment. If the payment can\'t be collected, your account reverts to the free tier — but all your existing data stays intact.',
  },
]

export default async function PricingPage() {
  const session = await auth()

  return (
    <div className="min-h-screen bg-white">
      {/* Header for unauthenticated users */}
      {!session && (
        <nav className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Θ</span>
                </div>
                <span className="text-xl font-bold text-neutral-900">
                  <span className="text-primary-600">Greek</span>Wheel
                </span>
              </Link>
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-neutral-700 hover:text-neutral-900 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Pricing Hero */}
      <section className="pt-16 pb-8 sm:pt-20 sm:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-neutral-900 mb-4">
            Simple, honest pricing.
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Start free. Upgrade when you need unlimited trades.
            No hidden fees, no feature gates.
          </p>
        </div>
      </section>

      {/* Pricing Cards with Toggle */}
      <PricingToggle isLoggedIn={!!session} freeFeatures={freeFeatures} proFeatures={proFeatures} />

      {/* FAQ Section */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-neutral-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <dl className="space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-lg border border-neutral-200 bg-white p-6"
              >
                <dt className="text-lg font-semibold text-neutral-900">
                  {faq.question}
                </dt>
                <dd className="mt-2 text-neutral-600 leading-relaxed">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-gradient-to-br from-primary-500 to-primary-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to master the wheel?
          </h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Start tracking your options trades for free. Upgrade to Pro when you need unlimited tracking.
          </p>
          {!session ? (
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 font-bold rounded-lg hover:bg-neutral-50 transition-all shadow-xl hover:shadow-2xl"
            >
              Start Tracking Free
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 font-bold rounded-lg hover:bg-neutral-50 transition-all shadow-xl hover:shadow-2xl"
            >
              Go to Dashboard
            </Link>
          )}
          <p className="mt-6 text-sm text-primary-200">
            No credit card required to start.
          </p>
        </div>
      </section>

      {/* Footer (for unauthenticated users) */}
      {!session && (
        <footer className="bg-neutral-900 text-neutral-400 py-8 border-t border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center text-sm">
              <p>&copy; 2026 GreekWheel. Built for traders who speak Greek.</p>
              <div className="flex space-x-6 mt-4 sm:mt-0">
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
