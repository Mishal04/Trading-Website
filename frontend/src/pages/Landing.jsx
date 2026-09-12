import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  Award,
  Shield,
  ArrowRight,
  CheckCircle2,
  Percent,
  Wallet,
  Clock,
  Calendar,
  Layers,
  ArrowLeftRight,
  ShieldAlert,
  Zap,
  BarChart3,
  Sparkles,
  Activity,
  Globe,
  FileText
} from 'lucide-react';
import ProfitCalculator from '../components/ProfitCalculator';

import LiveTradingChart from '../components/trading/LiveTradingChart';
import MarketOverviewCards from '../components/trading/MarketOverviewCards';
import InstitutionalTradingSection from '../components/trading/InstitutionalTradingSection';



const ROI_PERIODS = [
  {
    name: 'Period A',
    dates: 'Sep 10, 2026 – Dec 31, 2026',
    desc: 'High Growth Phase',
    rates: [
      { pkg: '$100 – $1,000', rate: '1.0% Daily' },
      { pkg: '$2,000 – $5,000', rate: '1.5% Daily' },
      { pkg: '$7,000 – $10,000', rate: '2.0% Daily' },
    ],
    highlight: true,
  },
  {
    name: 'Period B',
    dates: 'Jan 01, 2027 – Apr 30, 2027',
    desc: 'Consolidation Phase',
    rates: [
      { pkg: '$100 – $1,000', rate: '0.5% Daily' },
      { pkg: '$2,000 – $5,000', rate: '0.75% Daily' },
      { pkg: '$7,000 – $10,000', rate: '1.0% Daily' },
    ],
  },
  {
    name: 'Period C',
    dates: 'May 01, 2027 Onwards',
    desc: 'Perpetual Yield Phase',
    rates: [
      { pkg: 'All Packages ($100+)', rate: '8.0% Monthly' },
    ],
    note: 'This 8% Monthly rate applies only to Investor accounts. Networker/Affiliate plan rates remain unchanged and are not affected by this phase.'
  },
];

const LEVEL_DISTRIBUTION = [
  { level: 'Level 1', rate: '25.0%' },
  { level: 'Level 2', rate: '15.0%' },
  { level: 'Level 3', rate: '10.0%' },
  { level: 'Level 4', rate: '5.0%' },
  { level: 'Level 5', rate: '5.0%' },
  { level: 'Level 6–10', rate: '2.0% each (10%)' },
  { level: 'Level 11–20', rate: '0.9% each (9%)' },
  { level: 'Level 21', rate: '1.0%' },
];

const LEVEL_UNLOCK_RULES = [
  { directs: '1 Direct Referral', unlocked: '2 Levels Unlocked' },
  { directs: '2 Direct Referrals', unlocked: '4 Levels Unlocked' },
  { directs: '3 Direct Referrals', unlocked: '6 Levels Unlocked' },
  { directs: '4 Direct Referrals', unlocked: '8 Levels Unlocked' },
  { directs: '5 Direct Referrals', unlocked: '10 Levels Unlocked' },
  { directs: '6 Direct Referrals', unlocked: '12 Levels Unlocked' },
  { directs: '7 Direct Referrals', unlocked: '14 Levels Unlocked' },
  { directs: '8 Direct Referrals', unlocked: '16 Levels Unlocked' },
  { directs: '9 Direct Referrals', unlocked: '18 Levels Unlocked' },
  { directs: '10+ Direct Referrals', unlocked: 'All 21 Levels Unlocked (Full Tree)' },
];

const SAMPLE_ACHIEVEMENTS = [
  { rank: 'Pioneer', bv: '$1,000', reward: '$20 USDT' },
  { rank: 'Builder', bv: '$5,000', reward: '$100 USDT' },
  { rank: 'Achiever', bv: '$7,500', reward: '$140 USDT' },
  { rank: 'Influencer', bv: '$10,000', reward: '$200 USDT' },
  { rank: 'Mentor', bv: '$15,000', reward: '$300 USDT' },
  { rank: 'Captain', bv: '$20,000', reward: '$400 USDT' },
  { rank: 'Champion', bv: '$25,000', reward: '$500 USDT' },
  { rank: 'Elite', bv: '$35,000', reward: '$700 USDT' },
  { rank: 'Innovator', bv: '$50,000', reward: '$1,000 USDT' },
  { rank: 'Titan', bv: '$100,000', reward: '$2,000 USDT' },
  { rank: 'Silver Elite', bv: '$250,000', reward: '$5,000 USDT' },
  { rank: 'Platinum Elite', bv: '$500,000', reward: '$10,000 USDT' },
  { rank: 'Ruby Elite', bv: '$1,000,000', reward: '$20,000 USDT' },
  { rank: 'Legacy Founder', bv: '$100,000,000', reward: '$4,000,000 USDT' },
];

export default function Landing() {
  return (
    <div className="space-y-16">
      {/* Real-time Ticker Tape Bar */}
      

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden pt-6 pb-16">
        <div className="absolute inset-0 bg-gradient-to-b from-gold-900/15 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Brand Logo Emblem */}
            <div className="flex justify-center mb-6">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-gold-500/40 via-gold-400/20 to-gold-600/40 rounded-full blur-2xl opacity-60 group-hover:opacity-90 transition duration-700 animate-pulse" />
                <img
                  src="/logo.png"
                  alt="SOLVEX - Trade Smarter, Grow Further"
                  className="relative w-32 h-32 sm:w-40 sm:h-40 object-contain drop-shadow-[0_10px_40px_rgba(212,175,55,0.45)] hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-400 text-xs font-semibold mb-6">
              <Zap size={14} />
              Institutional Group Trading Plan · Live Market Execution
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight mb-6">
              21 Levels.
              <br />
              <span className="gradient-text">3X Investor Cap. 5X Networker Cap.</span>
            </h1>

<p className="max-w-3xl mx-auto text-gray-300 text-base sm:text-lg mb-10 leading-relaxed">
  Choose your activation package from <strong>$100 to $10,000</strong>. Investors earn ROI on their investment up to a 3× income cap of the invested amount, while Networkers/Affiliates earn from the 21‑level affiliate structure up to a 5× income cap.
</p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 hover:from-gold-400 hover:to-gold-300 transition-all gold-glow"
              >
                Start Investing Now <ArrowRight size={18} />
              </Link>
              <a
                href="#live-markets"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold border border-gold-400/40 bg-gold-400/5 text-gold-300 hover:border-gold-400 hover:bg-gold-400/15 transition-all"
              >
                <Activity size={16} /> View Live Charts
              </a>
              <a
                href="#packages"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold border border-dark-500 text-gray-300 hover:border-gold-400 hover:text-gold-400 transition-all"
              >
                Explore Packages
              </a>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-12 grid grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { icon: Percent, label: 'Level Pool Share', value: '80% Across 21L' },
              { icon: Shield, label: 'Global Income Cap', value: '5X Total Invested' },
              { icon: Zap, label: 'Affiliate Network', value: '21 Levels' },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-dark-500 bg-dark-800/70 p-4 text-center backdrop-blur-xl">
                <m.icon className="mx-auto mb-2 text-gold-400" size={20} />
                <div className="text-base sm:text-lg font-bold text-white">{m.value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE TRADING MARKETS & INTERACTIVE CHARTS SECTION ──────────────── */}
      <section id="live-markets" className="py-16 bg-dark-900/60 border-y border-dark-600/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              <Activity size={14} className="animate-pulse" /> Live Market Feed · Real-Time Execution
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-2">
              Live Trading <span className="gradient-text">Charts & Technical Analysis</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm">
              Inspect real-time institutional price action, candlestick chart trends, and multi-indicator technical summaries across Bitcoin, Ethereum, Solana, Gold Spot, and major Forex pairs.
            </p>
          </div>

          {/* 4 Mini Real-time Market Overview Cards */}
          <div className="mb-8">
            <MarketOverviewCards />
          </div>

          {/* Interactive TradingView Chart Component */}
          <div>
            <LiveTradingChart />
          </div>
        </div>
      </section>

      {/* ── INSTITUTIONAL AI TRADING & ENGINE SECTION ──────────────────────── */}
      <InstitutionalTradingSection />

      {/* ROI Date Periods */}
      <section id="profit" className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white mb-2">
              Structured <span className="gradient-text">ROI Date Periods</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm">
              Our trading schedule evolves over 3 distinct periods, balancing high aggressive early yields with long-term capital sustainability.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {ROI_PERIODS.map((period) => (
              <div
                key={period.name}
                className={`rounded-2xl border p-6 relative backdrop-blur-xl ${
                  period.highlight
                    ? 'border-gold-500/50 bg-gradient-to-b from-gold-500/10 to-dark-800 ring-1 ring-gold-400/30'
                    : 'border-dark-500 bg-dark-800/60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase text-gold-400 tracking-wider">{period.name}</span>
                  <Calendar size={16} className="text-gold-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{period.desc}</h3>
                <p className="text-xs font-mono text-gray-400 mb-6">{period.dates}</p>

                <div className="space-y-3">
                  {period.rates.map((r) => (
                    <div key={r.pkg} className="p-3 rounded-xl bg-dark-900/80 border border-dark-600 flex justify-between items-center text-xs">
                      <span className="text-gray-300 font-medium">{r.pkg}</span>
                      <span className="font-extrabold text-emerald-400 text-sm">{r.rate}</span>
                    </div>
                  ))}
                  {period.note && (
                    <p className="text-[11px] text-gray-400 leading-relaxed pt-1.5 px-0.5 border-t border-dark-600/50">
                      {period.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 21-Level Income & Unlocking Rules */}
      <section id="levels" className="py-16 bg-dark-800/40 border-y border-dark-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white mb-2">
              21-Level <span className="gradient-text">Affiliate Distribution</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto text-sm">
              Total 80% level commission pool distributed across 21 generations. Unlocking is strictly unlocked by active direct referrals.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Rates Table */}
            <div className="rounded-2xl border border-dark-500 bg-dark-800/70 p-6 backdrop-blur-xl">
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Layers className="text-gold-400" size={18} /> Level Commission Rates (80% Total)
              </h3>
              <div className="divide-y divide-dark-600 text-xs">
                {LEVEL_DISTRIBUTION.map((row) => (
                  <div key={row.level} className="py-2.5 flex justify-between items-center">
                    <span className="text-gray-300 font-medium">{row.level}</span>
                    <span className="font-extrabold text-emerald-400">{row.rate}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-gold-400/10 border border-gold-400/20 text-xs text-gold-300">
                L1–L5 carry the highest incentive weights (25%, 15%, 10%, 5%, 5% = 60%).
              </div>
            </div>

            {/* Unlocking Criteria */}
            <div className="rounded-2xl border border-dark-500 bg-dark-800/70 p-6 backdrop-blur-xl">
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Users className="text-gold-400" size={18} /> Level Opening Rules
              </h3>
              <div className="divide-y divide-dark-600 text-xs">
                {LEVEL_UNLOCK_RULES.map((rule) => (
                  <div key={rule.directs} className="py-2.5 flex justify-between items-center">
                    <span className="text-gray-300 font-medium">{rule.directs}</span>
                    <span className="font-bold text-gold-400">{rule.unlocked}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                10 direct referrals unlock all 21 generations across your entire organization.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Terms & Conditions Section */}
      <section id="terms" className="py-16 bg-dark-900/40 border-b border-dark-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-400 text-xs font-bold uppercase tracking-wider mb-3">
              <FileText size={14} /> Official Policy & Guidelines
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-2">
              Terms & <span className="gradient-text">Conditions</span>
            </h2>
          </div>

          <div className="max-w-4xl mx-auto rounded-2xl border border-dark-500 bg-dark-800/70 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
            <ul className="space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-gold-400 mt-2 shrink-0"></span>
                <span>The 8% Monthly rate under the Perpetual Yield Phase (Period C) applies exclusively to Investor accounts and is calculated on the invested principal amount.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-gold-400 mt-2 shrink-0"></span>
                <span>Networker/Affiliate accounts continue to earn strictly according to their existing plan structure (daily ROI rates and 21-level affiliate commissions); this phase does not alter Networker earnings or rates in any way.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-gold-400 mt-2 shrink-0"></span>
                <span>Investors may withdraw their principal amount at any time, with no lock-in period, subject to standard processing timelines.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-gold-400 mt-2 shrink-0"></span>
                <span>Daily/Monthly ROI earnings are separate from the principal and are credited according to the applicable Period (A, B, or C) rate active at that time.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-gold-400 mt-2 shrink-0"></span>
                <span>All earnings (ROI + affiliate income + achievement rewards) are subject to a maximum income cap: 3x for Investors and 5x for Networkers, calculated on total activation/investment amount.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-gold-400 mt-2 shrink-0"></span>
                <span>Once the income cap is reached, no further ROI, affiliate, or bonus earnings will be credited to that account/package.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-gold-400 mt-2 shrink-0"></span>
                <span>Achievement rewards and affiliate commissions are credited only after all eligibility conditions (active status, direct referral requirements, business volume, etc.) are met.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-gold-400 mt-2 shrink-0"></span>
                <span>The company reserves the right to revise ROI rates, phase periods, or terms with prior notice on the platform.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-gold-400 mt-2 shrink-0"></span>
                <span>All withdrawals are subject to applicable processing fees and timelines as set by the platform.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-gold-400 mt-2 shrink-0"></span>
                <span>Users are responsible for ensuring their account and payment details are accurate; the company is not liable for losses due to incorrect information provided by the user.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5X Income Cap */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-white mb-2">
              Maximum <span className="gradient-text">Income Cap</span>
            </h2>
            <p className="text-gray-400 text-sm">
                              Cap applies to the sum of ROI + Level Income (totalEarned). Investors are capped at 3× their investment, while Networkers have a 5× cap. Achievement rewards do not count toward cap.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
  <div className="grid sm:grid-cols-2 gap-4">
    {/* Investor Card */}
    <div className="rounded-2xl border border-gold-500/40 bg-dark-800/80 p-8 backdrop-blur-xl shadow-xl shadow-gold-500/5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-black uppercase text-gold-400 tracking-wider">INVESTOR EARNING LIMIT</span>
        <span className="px-3.5 py-1 rounded-full text-xs font-extrabold bg-gold-400 text-dark-900 shadow-md">
          3X CAP
        </span>
      </div>
      <h3 className="text-2xl font-black text-white mb-2">300% Total Return Cap</h3>
      <p className="text-sm text-gray-300 mb-6 leading-relaxed">
        Investor accounts earn up to 300% (3 × Total Invested) in cumulative ROI earnings. Once the 3X threshold is reached, principal can be withdrawn or reinvested to continue earning.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-dark-900 border border-dark-600 text-xs text-gray-300">
          <div className="font-bold text-white mb-1">$1,000 Investment</div>
          <div className="text-gold-400 font-semibold text-sm">→ $3,000 Maximum Cap</div>
        </div>
        <div className="p-4 rounded-xl bg-dark-900 border border-dark-600 text-xs text-gray-300">
          <div className="font-bold text-white mb-1">$5,000 Investment</div>
          <div className="text-gold-400 font-semibold text-sm">→ $15,000 Maximum Cap</div>
        </div>
      </div>
    </div>

    {/* Networker Card */}
    <div className="rounded-2xl border border-gold-500/40 bg-dark-800/80 p-8 backdrop-blur-xl shadow-xl shadow-gold-500/5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-black uppercase text-gold-400 tracking-wider">NETWORKER EARNING LIMIT</span>
        <span className="px-3.5 py-1 rounded-full text-xs font-extrabold bg-gold-400 text-dark-900 shadow-md">
          5X CAP
        </span>
      </div>
      <h3 className="text-2xl font-black text-white mb-2">500% Total Return Cap</h3>
      <p className="text-sm text-gray-300 mb-6 leading-relaxed">
        Networker/Affiliate accounts earn up to 500% (5 × Total Invested) in cumulative earnings across ROI distributions and referral level commissions. Once the 5X threshold is reached, simply reinvest or add new capital to continue earning.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-dark-900 border border-dark-600 text-xs text-gray-300">
          <div className="font-bold text-white mb-1">$1,000 Investment</div>
          <div className="text-gold-400 font-semibold text-sm">→ $5,000 Maximum Cap</div>
        </div>
        <div className="p-4 rounded-xl bg-dark-900 border border-dark-600 text-xs text-gray-300">
          <div className="font-bold text-white mb-1">$5,000 Investment</div>
          <div className="text-gold-400 font-semibold text-sm">→ $25,000 Maximum Cap</div>
        </div>
      </div>
    </div>
  </div>
</div>
        </div>
      </section>

      {/* Achievements Summary with 60/40 BV Rule */}
      <section id="rewards" className="py-16 bg-dark-800/40 border-y border-dark-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-white mb-2">
              Fixed Achievement <span className="gradient-text">Cash Rewards</span>
            </h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              Earn fixed one-time cash rewards credited straight to your <strong>Profit wallet</strong>. 
              Governed strictly by the <strong>60/40 Business Volume (BV)</strong> rule.
            </p>
          </div>

          {/* 60/40 Rule Banner */}
          <div className="mb-10 max-w-3xl mx-auto rounded-xl border border-gold-500/30 bg-gold-500/5 p-5 text-xs text-gray-300 leading-relaxed">
            <h4 className="font-bold text-gold-400 mb-1 flex items-center gap-1.5 text-sm">
              <CheckCircle2 size={16} /> The 60/40 BV Qualification Rule
            </h4>
            To qualify for any tier: Maximum 60% of required BV can come from your strongest direct referral leg; 
            the remaining 40% minimum must come from all other referral legs combined. 
            <strong> Rewards pay the full fixed cash amount</strong> upon meeting BV criteria.
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {SAMPLE_ACHIEVEMENTS.map((t) => (
              <div key={t.rank} className="p-3.5 rounded-xl border border-dark-500 bg-dark-800/80 text-center hover:border-gold-400/40 transition-all">
                <div className="text-xs font-bold text-white truncate">{t.rank}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{t.bv} BV</div>
                <div className="text-xs font-extrabold text-emerald-400 mt-2">{t.reward}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Withdrawal & P2P Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-white mb-2">
              Flexible <span className="gradient-text">Withdrawal Options</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6 text-center">
              <Wallet className="mx-auto mb-3 text-gold-400" size={28} />
              <h3 className="font-bold text-white mb-1">On-Chain Multi-Network</h3>
              <p className="text-xs text-gray-400">
                Deposit and withdraw directly in USDT via <strong>BEP20</strong> (BNB Smart Chain) and <strong>TRC20</strong> (TRON Network).
              </p>
            </div>

            <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6 text-center">
              <Clock className="mx-auto mb-3 text-emerald-400" size={28} />
              <h3 className="font-bold text-white mb-1">Min $10 USDT Withdrawal</h3>
              <p className="text-xs text-gray-400">
                Low $10 minimum payout threshold. Regular daily withdrawal request window: <strong>10:30 PM to 12:00 Midnight</strong>.
              </p>
            </div>


          </div>
        </div>
      </section>

      {/* Profit Projection Calculator */}
      <ProfitCalculator />

      {/* ── INVESTORS SECTION ──────────────────────────────────────────────── */}
      <section id="investors" className="py-20 px-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block mb-3 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
            Investor Programme
          </span>
          <h2 className="text-4xl font-black text-white mb-4">
            Direct Investment Plans
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm leading-relaxed">
            Earn structured daily ROI on your capital with two dedicated plans.
            No MLM commissions — just transparent, predictable returns.
            After 6 months, earn <strong className="text-amber-400">8% per month</strong> forever.
          </p>
        </div>

        {/* Plan A & Plan B cards side by side */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Plan A */}
          <div className="rounded-3xl border p-7"
               style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.3)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black text-white">Plan A</h3>
                <p className="text-amber-400 text-sm font-semibold">Higher Daily Rates</p>
              </div>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold text-dark-900"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                Default
              </span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Package 1', amounts: '$100, $200, $300, $900', rate: '0.75% / day' },
                { label: 'Package 2', amounts: '$1,000 – $5,000',        rate: '0.90% / day' },
                { label: 'Package 3', amounts: '$6,000 – $9,000',        rate: '1.00% / day' },
                { label: 'Package 4', amounts: '$10,000+',               rate: '1.25% / day' }
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/8 px-4 py-3"
                     style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div>
                    <p className="text-white text-sm font-semibold">{row.label}</p>
                    <p className="text-gray-500 text-xs">{row.amounts}</p>
                  </div>
                  <span className="text-amber-400 font-black text-base">{row.rate}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-4 italic">
              Plan A daily ROI rates are active for 6 months from activation.
            </p>
          </div>

          {/* Plan B */}
          <div className="rounded-3xl border p-7"
               style={{ background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.3)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black text-white">Plan B</h3>
                <p className="text-purple-400 text-sm font-semibold">Standard Daily Rates</p>
              </div>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold text-white border border-purple-500/50"
                    style={{ background: 'rgba(139,92,246,0.2)' }}>
                Admin Assigned
              </span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Package 1', amounts: '$100, $200, $300, $900', rate: '0.50% / day' },
                { label: 'Package 2', amounts: '$1,000 – $5,000',        rate: '0.75% / day' },
                { label: 'Package 3', amounts: '$6,000 – $9,000',        rate: '1.00% / day' },
                { label: 'Package 4', amounts: '$10,000+',               rate: '1.25% / day' }
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/8 px-4 py-3"
                     style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div>
                    <p className="text-white text-sm font-semibold">{row.label}</p>
                    <p className="text-gray-500 text-xs">{row.amounts}</p>
                  </div>
                  <span className="text-purple-400 font-black text-base">{row.rate}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-4 italic">
              Plan B daily ROI rates are active for 6 months from activation.
            </p>
          </div>
        </div>

        {/* After-1-year transition note */}
        <p className="text-center text-gray-400 text-sm mb-10">
          After 1 year, all active investors transition to a fixed{' '}
          <span className="text-emerald-400 font-semibold">8%–10% monthly rate</span>.
        </p>

        {/* Rules strip */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          <div className="rounded-2xl border border-white/8 p-5 text-center"
               style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-2xl font-black text-emerald-400 mb-1">8% / mo</p>
            <p className="text-white text-sm font-semibold">After 6 Months</p>
            <p className="text-gray-500 text-xs mt-1">Both plans switch to 8% monthly ROI automatically</p>
          </div>
          <div className="rounded-2xl border border-white/8 p-5 text-center"
               style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-2xl font-black text-amber-400 mb-1">3× Cap</p>
            <p className="text-white text-sm font-semibold">Income Limit</p>
            <p className="text-gray-500 text-xs mt-1">Maximum total ROI = 3× your invested amount</p>
          </div>
          <div className="rounded-2xl border border-white/8 p-5 text-center"
               style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-2xl font-black text-blue-400 mb-1">Anytime</p>
            <p className="text-white text-sm font-semibold">Principal Withdraw</p>
            <p className="text-gray-500 text-xs mt-1">Withdraw your original capital at any time</p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/investor/register"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl font-extrabold text-dark-900 hover:brightness-110 transition-all text-base"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
            Open Investor Account <ArrowRight size={20} />
          </Link>
          <Link to="/investor/login"
                className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl font-bold text-amber-400 border border-amber-500/40 hover:bg-amber-500/10 transition-all text-base">
            Investor Login
          </Link>
        </div>
      </section>

      {/* Direct Referral Commission */}
      <section className="py-12 bg-dark-900/40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-400 text-xs font-bold uppercase tracking-wider mb-5">
            Referral Rewards
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
            Direct Referral Commission
          </h2>
          <p className="text-gray-300 text-base leading-relaxed">
            Earn a <span className="text-gold-400 font-bold">5% direct commission</span> instantly when someone you referred makes a deposit. The commission is credited to your account immediately at the time of their deposit.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center max-w-3xl mx-auto px-4">
        <h2 className="text-3xl font-black text-white mb-4">Start Your Portfolio Today</h2>
        <p className="text-gray-400 text-sm mb-8">
          Join thousands of members earning structured daily returns and team commissions.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-extrabold bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 hover:brightness-110 transition-all gold-glow text-base"
        >
          Register Free Account <ArrowRight size={20} />
        </Link>
      </section>
    </div>
  );
}
