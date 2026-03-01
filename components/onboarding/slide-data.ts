import type { LucideIcon } from 'lucide-react'
import { RefreshCcw, Wallet, FileText, BarChart3, CheckCircle2 } from 'lucide-react'

export interface SlideContent {
  id: number
  heading: string
  body: string
  Icon: LucideIcon | null // null for the welcome slide (uses custom theta)
  isFinal?: boolean
}

export const slides: SlideContent[] = [
  {
    id: 1,
    heading: 'Welcome to GreekWheel',
    body: "Your personal tracker for the options wheel strategy. Let us show you around -- this will take less than a minute.",
    Icon: null,
  },
  {
    id: 2,
    heading: 'Track Your Wheel Rotations',
    body: 'The wheel strategy cycles through three steps: sell a cash-secured PUT, get assigned stock, then sell covered CALLs. GreekWheel tracks every step automatically.',
    Icon: RefreshCcw,
  },
  {
    id: 3,
    heading: 'Start With Your Deposits',
    body: 'Record your cash deposits so GreekWheel can calculate your returns and compare your performance against buying SPY.',
    Icon: Wallet,
  },
  {
    id: 4,
    heading: 'Log Your Trades',
    body: 'Create trades as you sell PUTs and CALLs. When a PUT gets assigned, mark it -- GreekWheel creates your stock position and calculates your cost basis automatically.',
    Icon: FileText,
  },
  {
    id: 5,
    heading: 'Track Your Performance',
    body: 'Your dashboard shows P&L, premium collected, win rate, and how you compare to SPY. The Scanner helps you find new wheel opportunities.',
    Icon: BarChart3,
  },
  {
    id: 6,
    heading: "You're Ready to Roll",
    body: 'Start by recording a deposit, or jump right in and create your first trade. You can always find help in the Help Center.',
    Icon: CheckCircle2,
    isFinal: true,
  },
]
