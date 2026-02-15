import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getConversionFunnelMetrics,
  getSubscriptionMetrics,
  getWebhookHealthMetrics,
} from '@/lib/analytics-server'

export const metadata = {
  title: 'Analytics | Admin',
  description: 'Conversion funnel, subscription metrics, and webhook health',
}

export default async function AdminAnalyticsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const [funnel, subscriptions, webhookHealth] = await Promise.all([
    getConversionFunnelMetrics(30),
    getSubscriptionMetrics(),
    getWebhookHealthMetrics(7),
  ])

  const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-900 mb-8">Monitoring &amp; Analytics</h1>

        {/* Subscription Overview */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-800 mb-4">Subscription Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard label="Total Users" value={subscriptions.totalUsers} />
            <MetricCard label="Pro Users" value={subscriptions.proUsers} />
            <MetricCard label="At Limit (Free)" value={subscriptions.freeUsersAtLimit} />
            <MetricCard label="Recent Churns" value={subscriptions.recentChurns} />
          </div>
        </section>

        {/* Conversion Funnel */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-800 mb-4">
            Conversion Funnel ({funnel.period})
          </h2>
          <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="text-left px-4 py-3 font-medium text-neutral-600">Step</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-600">Count</th>
                  <th className="text-right px-4 py-3 font-medium text-neutral-600">Rate</th>
                </tr>
              </thead>
              <tbody>
                <FunnelRow
                  label="Trade limit reached"
                  count={funnel.funnel.trade_limit_reached}
                  rate={null}
                />
                <FunnelRow
                  label="Upgrade prompt shown"
                  count={funnel.funnel.upgrade_prompt_shown}
                  rate={fmtPct(funnel.conversionRates.limitToPrompt)}
                />
                <FunnelRow
                  label="Checkout started"
                  count={funnel.funnel.checkout_started}
                  rate={fmtPct(funnel.conversionRates.promptToCheckout)}
                />
                <FunnelRow
                  label="Subscription activated"
                  count={funnel.funnel.subscription_activated}
                  rate={fmtPct(funnel.conversionRates.checkoutToActivated)}
                />
              </tbody>
              <tfoot>
                <tr className="border-t border-neutral-200 bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-700">Overall Conversion</td>
                  <td />
                  <td className="text-right px-4 py-3 font-semibold text-neutral-900">
                    {fmtPct(funnel.conversionRates.overallConversion)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Webhook Health */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-800 mb-4">
            Webhook Health ({webhookHealth.period})
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <MetricCard label="Processed" value={webhookHealth.totalProcessed} />
            <MetricCard
              label="Failures"
              value={webhookHealth.failures}
              alert={webhookHealth.failures > 0}
            />
            <MetricCard
              label="Success Rate"
              value={fmtPct(webhookHealth.successRate)}
              alert={webhookHealth.successRate < 1}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  alert,
}: {
  label: string
  value: string | number
  alert?: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        alert ? 'border-red-300 bg-red-50' : 'border-neutral-200 bg-white'
      }`}
    >
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${alert ? 'text-red-700' : 'text-neutral-900'}`}>
        {value}
      </p>
    </div>
  )
}

function FunnelRow({ label, count, rate }: { label: string; count: number; rate: string | null }) {
  return (
    <tr className="border-b border-neutral-100">
      <td className="px-4 py-3 text-neutral-700">{label}</td>
      <td className="text-right px-4 py-3 font-mono text-neutral-900">{count}</td>
      <td className="text-right px-4 py-3 font-mono text-neutral-500">{rate ?? '\u2014'}</td>
    </tr>
  )
}
