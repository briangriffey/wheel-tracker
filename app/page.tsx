import Link from 'next/link'
import { auth } from '@/lib/auth'
import {
  ArrowRight,
  TrendingUp,
  Target,
  DollarSign,
  BarChart3,
  CheckCircle2,
  Repeat,
  Calculator,
  LineChart,
} from 'lucide-react'

export default async function Home() {
  const session = await auth()

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              {/* Placeholder for logo - will be replaced with actual logo */}
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">Θ</span>
              </div>
              <span className="text-xl font-bold text-neutral-900">
                <span className="text-primary-600">Greek</span>Wheel
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {!session ? (
                <>
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
                </>
              ) : (
                <Link
                  href="/dashboard"
                  className="px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-neutral-50 to-white pt-20 pb-32">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-100 rounded-full opacity-20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-200 rounded-full opacity-20 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <span className="text-lg">Θ</span>
              <span>Built for traders who speak Greek</span>
            </div>

            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-neutral-900 mb-6 leading-tight">
              Master the Greeks.
              <br />
              <span className="text-primary-600">Perfect the Wheel.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-neutral-600 mb-12 leading-relaxed max-w-3xl mx-auto">
              Track every premium, manage every position, and optimize your wheel strategy with
              precision.
              <span className="block mt-2 text-lg text-neutral-500">
                The systematic options tracker for disciplined traders.
              </span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              {!session ? (
                <>
                  <Link
                    href="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl group"
                  >
                    Start Tracking Your Greeks
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-white text-neutral-700 font-semibold rounded-lg border-2 border-neutral-200 hover:border-neutral-300 transition-all"
                  >
                    View Demo
                  </Link>
                </>
              ) : (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl group"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>

            {/* Social proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-neutral-500">
              <div className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-primary-500 mr-2" />
                <span>20 trades free — no credit card</span>
              </div>
              <div className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-primary-500 mr-2" />
                <span>Unlimited trades for $8/month</span>
              </div>
              <div className="flex items-center">
                <CheckCircle2 className="w-5 h-5 text-primary-500 mr-2" />
                <span>Built for r/optionswheel</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
              Everything you need to master the wheel
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Track, analyze, and optimize every aspect of your wheel strategy with precision tools
              built for systematic traders.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-primary-50 to-white p-8 rounded-2xl border border-primary-100 hover:border-primary-300 transition-all hover:shadow-lg">
              <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center mb-6">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Track Your Greeks</h3>
              <p className="text-neutral-600 mb-4">
                Monitor Δ, Θ, Γ, and Vega across all positions. Understand how time decay and price
                movement affect your portfolio.
              </p>
              <div className="text-primary-600 font-medium text-sm">
                Real-time Greek calculations →
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-primary-50 to-white p-8 rounded-2xl border border-primary-100 hover:border-primary-300 transition-all hover:shadow-lg">
              <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center mb-6">
                <Repeat className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Perfect Each Rotation</h3>
              <p className="text-neutral-600 mb-4">
                Track the complete cycle: cash-secured PUT → assignment → stock position → covered
                CALL. Optimize every step.
              </p>
              <div className="text-primary-600 font-medium text-sm">PUT → Stock → CALL →</div>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-primary-50 to-white p-8 rounded-2xl border border-primary-100 hover:border-primary-300 transition-all hover:shadow-lg">
              <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center mb-6">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Maximize Premium</h3>
              <p className="text-neutral-600 mb-4">
                See exactly where your income comes from. Track premium collected, time decay
                captured, and total P&L per position.
              </p>
              <div className="text-primary-600 font-medium text-sm">Premium analytics →</div>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-primary-50 to-white p-8 rounded-2xl border border-primary-100 hover:border-primary-300 transition-all hover:shadow-lg">
              <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">Beat Benchmarks</h3>
              <p className="text-neutral-600 mb-4">
                Compare your performance against SPY, QQQ, and custom benchmarks. Prove your
                strategy works with real data.
              </p>
              <div className="text-primary-600 font-medium text-sm">Performance tracking →</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
              The Wheel Strategy, Simplified
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              From your first PUT to consistent income, GreekWheel tracks every rotation with
              precision.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-2xl border-2 border-primary-200 shadow-sm">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  1
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-3 mt-4">
                  Sell Cash-Secured PUTs
                </h3>
                <p className="text-neutral-600 mb-4">
                  Collect premium by selling PUTs on stocks you want to own. Track strike price,
                  expiration, and Greeks.
                </p>
                <div className="bg-primary-50 p-4 rounded-lg border border-primary-100">
                  <div className="text-sm text-neutral-600 mb-1">Example:</div>
                  <div className="font-mono text-sm text-neutral-900">AAPL $170 PUT @ $2.50</div>
                  <div className="text-xs text-primary-600 mt-1">Premium: $250 | Θ: -0.15</div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-2xl border-2 border-primary-200 shadow-sm">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  2
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-3 mt-4">
                  Get Assigned Stock
                </h3>
                <p className="text-neutral-600 mb-4">
                  If assigned, your PUT converts to a stock position. GreekWheel automatically
                  tracks your new cost basis.
                </p>
                <div className="bg-primary-50 p-4 rounded-lg border border-primary-100">
                  <div className="text-sm text-neutral-600 mb-1">Position:</div>
                  <div className="font-mono text-sm text-neutral-900">100 AAPL @ $167.50</div>
                  <div className="text-xs text-primary-600 mt-1">Cost: $170 - $2.50 premium</div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-2xl border-2 border-primary-200 shadow-sm">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  3
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 mb-3 mt-4">
                  Sell Covered CALLs
                </h3>
                <p className="text-neutral-600 mb-4">
                  Collect more premium by selling CALLs against your stock. Track P&L and Greeks for
                  the complete rotation.
                </p>
                <div className="bg-primary-50 p-4 rounded-lg border border-primary-100">
                  <div className="text-sm text-neutral-600 mb-1">Trade:</div>
                  <div className="font-mono text-sm text-neutral-900">AAPL $175 CALL @ $3.00</div>
                  <div className="text-xs text-primary-600 mt-1">Total Premium: $550</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-lg text-neutral-600 mb-6">
              <span className="font-semibold text-neutral-900">Then repeat.</span> That&apos;s the
              wheel. GreekWheel makes it easy to track every rotation.
            </p>
            {!session && (
              <Link
                href="/register"
                className="inline-flex items-center px-8 py-4 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl"
              >
                Start Your First Rotation
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Deep Dive */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-6">
                Every Greek Tracked. Every Premium Counted.
              </h2>
              <p className="text-lg text-neutral-600 mb-8">
                GreekWheel goes beyond simple trade logging. We calculate the Greeks that
                matter—Delta, Theta, Gamma, and Vega—so you understand exactly how your positions
                behave.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-neutral-900">
                      Real-time Greek calculations
                    </div>
                    <div className="text-neutral-600">
                      See how time decay and price movement impact your positions
                    </div>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-neutral-900">Premium income tracking</div>
                    <div className="text-neutral-600">
                      Every dollar of premium collected, automatically calculated
                    </div>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-neutral-900">Position-level P&L</div>
                    <div className="text-neutral-600">
                      Track profit and loss across the entire wheel rotation
                    </div>
                  </div>
                </li>
              </ul>
            </div>
            <div className="bg-neutral-900 rounded-2xl p-8 text-white">
              <div className="mb-6">
                <div className="text-neutral-400 text-sm mb-2">Active Position</div>
                <div className="text-2xl font-bold">AAPL Wheel Rotation</div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <div className="text-neutral-400 text-xs mb-1">Delta (Δ)</div>
                  <div className="text-xl font-mono font-bold text-primary-400">+45.2</div>
                </div>
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <div className="text-neutral-400 text-xs mb-1">Theta (Θ)</div>
                  <div className="text-xl font-mono font-bold text-primary-400">-0.18</div>
                </div>
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <div className="text-neutral-400 text-xs mb-1">Gamma (Γ)</div>
                  <div className="text-xl font-mono font-bold text-primary-400">+0.05</div>
                </div>
                <div className="bg-neutral-800 p-4 rounded-lg">
                  <div className="text-neutral-400 text-xs mb-1">Total Premium</div>
                  <div className="text-xl font-mono font-bold text-primary-400">$550</div>
                </div>
              </div>
              <div className="bg-primary-500/20 border border-primary-500/30 p-4 rounded-lg">
                <div className="text-neutral-400 text-sm mb-1">Net P&L</div>
                <div className="text-3xl font-mono font-bold text-primary-400">+$723.50</div>
                <div className="text-sm text-neutral-400 mt-1">+4.3% return</div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-8">
              <div className="bg-white rounded-xl p-6 shadow-lg mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-neutral-600">Your Performance</div>
                  <LineChart className="w-5 h-5 text-primary-500" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-700">Year-to-Date</span>
                    <span className="font-mono font-bold text-primary-600">+18.4%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-700">SPY Benchmark</span>
                    <span className="font-mono font-bold text-neutral-500">+12.1%</span>
                  </div>
                  <div className="pt-3 border-t border-neutral-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-neutral-900">Alpha Generated</span>
                      <span className="font-mono font-bold text-primary-600">+6.3%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center text-sm text-primary-700">
                Real data. Real performance. Real alpha.
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-6">
                Are You Beating Buy-and-Hold? Prove It.
              </h2>
              <p className="text-lg text-neutral-600 mb-8">
                Compare your wheel strategy performance against market benchmarks like SPY, QQQ, and
                VTI. See your true alpha with honest, transparent metrics.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <TrendingUp className="w-6 h-6 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-neutral-900">Benchmark comparisons</div>
                    <div className="text-neutral-600">
                      Track against SPY, QQQ, VTI, or custom benchmarks
                    </div>
                  </div>
                </li>
                <li className="flex items-start">
                  <Target className="w-6 h-6 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-neutral-900">Performance analytics</div>
                    <div className="text-neutral-600">
                      Win rate, average return, Sharpe ratio, and more
                    </div>
                  </div>
                </li>
                <li className="flex items-start">
                  <BarChart3 className="w-6 h-6 text-primary-500 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-neutral-900">Visual charts</div>
                    <div className="text-neutral-600">
                      See your performance over time with beautiful, clear charts
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
              Simple, honest pricing.
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Start free. Upgrade when you&apos;re ready.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="bg-white p-8 rounded-2xl border-2 border-neutral-200 shadow-sm">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-neutral-900 mb-2">Free</h3>
                <div className="text-4xl font-bold text-neutral-900">
                  $0<span className="text-lg font-normal text-neutral-500">/month</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" />
                  <span className="text-neutral-700">20 trades</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" />
                  <span className="text-neutral-700">Full dashboard</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" />
                  <span className="text-neutral-700">Greek calculations</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" />
                  <span className="text-neutral-700">Wheel tracking</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" />
                  <span className="text-neutral-700">Benchmark comparisons</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" />
                  <span className="text-neutral-700">Cash deposit tracking</span>
                </li>
              </ul>
              {!session && (
                <Link
                  href="/register"
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-white text-neutral-700 font-semibold rounded-lg border-2 border-neutral-200 hover:border-neutral-300 transition-all"
                >
                  Get Started Free
                </Link>
              )}
            </div>

            {/* Pro Tier */}
            <div className="bg-white p-8 rounded-2xl border-2 border-primary-500 shadow-lg relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-neutral-900 mb-2">Pro</h3>
                <div className="text-4xl font-bold text-neutral-900">
                  $8<span className="text-lg font-normal text-neutral-500">/month</span>
                </div>
                <div className="text-sm text-neutral-500 mt-1">or $72/year (save 25%)</div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" />
                  <span className="text-neutral-700 font-semibold">Unlimited trades</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" />
                  <span className="text-neutral-700">Everything in Free</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0" />
                  <span className="text-neutral-700">Priority support</span>
                </li>
              </ul>
              <Link
                href="/pricing"
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-all shadow-md"
              >
                Start Pro — $8/mo
              </Link>
            </div>
          </div>

          <div className="text-center mt-8 text-sm text-neutral-500">
            No credit card required to start.
          </div>
        </div>
      </section>

      {/* Social Proof / Community */}
      <section className="py-20 bg-neutral-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built by Greeks, for Greeks</h2>
            <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
              GreekWheel was built by options traders who live and breathe the wheel strategy. We
              speak your language.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-neutral-800 p-8 rounded-2xl border border-neutral-700">
              <div className="text-4xl mb-4">📊</div>
              <div className="text-2xl font-bold mb-2">Precision Analytics</div>
              <p className="text-neutral-400">
                Track every Greek, every premium, every rotation with accuracy that matters.
              </p>
            </div>

            <div className="bg-neutral-800 p-8 rounded-2xl border border-neutral-700">
              <div className="text-4xl mb-4">🎯</div>
              <div className="text-2xl font-bold mb-2">r/optionswheel</div>
              <p className="text-neutral-400">
                Built for the community that understands systematic premium collection.
              </p>
            </div>

            <div className="bg-neutral-800 p-8 rounded-2xl border border-neutral-700">
              <div className="text-4xl mb-4">⚡</div>
              <div className="text-2xl font-bold mb-2">Real-Time Updates</div>
              <p className="text-neutral-400">
                Stay on top of your positions with live price updates and Greek calculations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-primary-500 to-primary-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">Ready to master the wheel?</h2>
          <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
            Join traders who track every Greek, optimize every rotation, and beat buy-and-hold with
            systematic precision.
          </p>

          {!session ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 font-bold rounded-lg hover:bg-neutral-50 transition-all shadow-xl hover:shadow-2xl group"
              >
                Start Tracking Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white font-semibold rounded-lg border-2 border-white/30 hover:bg-primary-500 transition-all"
              >
                View Demo
              </Link>
            </div>
          ) : (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 font-bold rounded-lg hover:bg-neutral-50 transition-all shadow-xl hover:shadow-2xl group"
            >
              Go to Dashboard
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

          <div className="mt-8 text-primary-100 text-sm">
            No credit card required • Free to start • Built for r/optionswheel
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-400 py-12 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">Θ</span>
                </div>
                <span className="text-xl font-bold text-white">
                  <span className="text-primary-500">Greek</span>Wheel
                </span>
              </div>
              <p className="text-sm">Master the Greeks. Perfect the Wheel.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/dashboard" className="hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-white transition-colors">
                    Demo
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/help" className="hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/help/faq" className="hover:text-white transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/help/glossary" className="hover:text-white transition-colors">
                    Glossary
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/greekwheel"
                    className="hover:text-white transition-colors"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-neutral-800 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm">
            <p>© 2026 GreekWheel. Built for traders who speak Greek.</p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
              <a href="#" className="hover:text-white transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
