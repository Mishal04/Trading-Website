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
} from 'lucide-react';
import ProfitCalculator from '../components/ProfitCalculator';

const packages = [
  {
    range: '$100 – $500',
    profit: '0.35% – 0.50%',
    label: 'Starter',
    popular: false,
  },
  {
    range: '$1,000 – $5,000',
    profit: '1.00% – 1.25%',
    label: 'Growth',
    popular: true,
  },
  {
    range: '$7,500 & Above',
    profit: '1.50% – 2.00%',
    label: 'Elite',
    popular: false,
  },
];

const profitShares = [
  { label: 'Investor Share', value: '60%', color: 'text-gold-400' },
  { label: '25-Level Commission', value: '10%', color: 'text-blue-400' },
  { label: 'Leadership Salary Pool', value: '6%', color: 'text-emerald-400' },
  { label: 'Performance Reward Pool', value: '4%', color: 'text-purple-400' },
  { label: 'Trader Share', value: '20%', color: 'text-orange-400' },
];

const levelRates = [
  { levels: 'Level 1', rate: '1.50%' },
  { levels: 'Level 2', rate: '1.00%' },
  { levels: 'Level 3', rate: '0.75%' },
  { levels: 'Level 4', rate: '0.50%' },
  { levels: 'Level 5', rate: '0.50%' },
  { levels: 'Level 6–10', rate: '0.35% each' },
  { levels: 'Level 11–15', rate: '0.30% each' },
  { levels: 'Level 16–20', rate: '0.25% each' },
  { levels: 'Level 21–25', rate: '0.25% each' },
];

const salaryTiers = [
  { business: '$10,000', reward: '$100' },
  { business: '$25,000', reward: '$250' },
  { business: '$50,000', reward: '$500' },
  { business: '$100,000', reward: '$1,000' },
  { business: '$250,000', reward: '$2,500' },
  { business: '$500,000', reward: '$5,000' },
  { business: '$1,000,000', reward: '$10,000' },
];

const rewardTiers = [
  { business: '$10,000', reward: '$100' },
  { business: '$25,000', reward: '$300' },
  { business: '$50,000', reward: '$750' },
  { business: '$100,000', reward: '$2,000' },
  { business: '$250,000', reward: '$5,000' },
  { business: '$500,000', reward: '$12,500' },
  { business: '$1,000,000', reward: '$25,000' },
  { business: '$2,500,000', reward: '$60,000' },
  { business: '$5,000,000', reward: '$125,000' },
];

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section id="home" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gold-900/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-400 text-xs font-medium mb-6">
            <Shield size={14} />
            Transparent Profit Sharing
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Group Trading Plan
            <br />
            <span className="gradient-text">Copy performance. Keep the gains.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-gray-400 text-lg mb-10">
            Invest with clear packages, 60% investor share, 25-level commissions,
            leadership salary and performance rewards — all driven by actual realized profit.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 hover:from-gold-400 hover:to-gold-300 transition-all gold-glow"
            >
              Start Now <ArrowRight size={18} />
            </Link>
            <a
              href="#packages"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold border border-dark-500 text-gray-300 hover:border-gold-400 hover:text-gold-400 transition-all"
            >
              View Packages
            </a>
          </div>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { icon: Percent, label: 'Investor Share', value: '60%' },
              { icon: Users, label: 'Commission Levels', value: '25' },
              { icon: Award, label: 'Salary + Reward Pool', value: '10%' },
              { icon: Wallet, label: 'Withdrawal', value: 'Anytime' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-dark-500 bg-dark-800/60 p-4 text-center"
              >
                <s.icon className="mx-auto mb-2 text-gold-400" size={20} />
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="py-20 bg-dark-800/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">
              Investment <span className="gradient-text">Packages</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Indicative daily profit ranges. Actual profit depends on performance and market conditions.
              These are not fixed or guaranteed returns.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.label}
                className={`relative rounded-2xl border p-6 card-hover ${
                  pkg.popular
                    ? 'border-gold-400 bg-dark-700/80 gold-glow'
                    : 'border-dark-500 bg-dark-800/60'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gold-400 text-dark-900 text-xs font-bold">
                    Popular
                  </span>
                )}
                <div className="text-sm text-gold-400 font-medium mb-1">{pkg.label}</div>
                <div className="text-2xl font-bold mb-4">{pkg.range}</div>
                <div className="text-sm text-gray-400 mb-1">Indicative Daily Profit</div>
                <div className="text-xl font-semibold text-emerald-400 mb-6">{pkg.profit}</div>
                <Link
                  to="/register"
                  className={`block text-center py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    pkg.popular
                      ? 'bg-gold-400 text-dark-900 hover:bg-gold-300'
                      : 'border border-dark-500 text-gray-300 hover:border-gold-400 hover:text-gold-400'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Profit Sharing */}
      <section id="profit" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">
              Actual Profit <span className="gradient-text">Sharing</span>
            </h2>
            <p className="text-gray-400">From 100% Actual Realized Profit</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            {profitShares.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-dark-500 bg-dark-800/60 p-5 text-center card-hover"
              >
                <div className={`text-3xl font-extrabold mb-2 ${s.color}`}>{s.value}</div>
                <div className="text-sm text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-6">
            Level + Salary + Reward = 20% Maximum · TOTAL = 100%
          </p>
        </div>
      </section>

      {/* 25 Level Commission */}
      <section id="levels" className="py-20 bg-dark-800/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">
              25-Level <span className="gradient-text">Commission</span>
            </h2>
            <p className="text-gray-400">Total Level Pool = 10% of Actual Profit</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl border border-dark-500 overflow-hidden">
              <div className="bg-dark-700 px-6 py-3 flex justify-between text-sm font-semibold text-gold-400">
                <span>Level</span>
                <span>Rate</span>
              </div>
              {levelRates.map((row, i) => (
                <div
                  key={row.levels}
                  className={`px-6 py-3 flex justify-between text-sm ${
                    i % 2 === 0 ? 'bg-dark-800/40' : 'bg-dark-800/80'
                  }`}
                >
                  <span className="text-gray-300">{row.levels}</span>
                  <span className="font-medium text-white">{row.rate}</span>
                </div>
              ))}
              <div className="bg-dark-700 px-6 py-3 flex justify-between text-sm font-bold">
                <span className="text-gold-400">TOTAL 25 LEVEL</span>
                <span className="text-gold-400">10%</span>
              </div>
            </div>
            <p className="text-center text-xs text-gray-500 mt-4">
              Top 5 levels receive stronger commission (L1–L5 = 4.25%)
            </p>
          </div>
        </div>
      </section>

      {/* Leadership Salary + Performance Reward */}
      <section id="rewards" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">
              Leadership Salary & <span className="gradient-text">Performance Rewards</span>
            </h2>
            <p className="text-gray-400">Subject to available pools · 60/40 Business Rule applies</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Salary */}
            <div className="rounded-2xl border border-dark-500 bg-dark-800/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-dark-500 bg-dark-700/50">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Award className="text-emerald-400" size={20} />
                  Leadership Salary — 6% Pool
                </h3>
              </div>
              <div className="divide-y divide-dark-500">
                {salaryTiers.map((t) => (
                  <div key={t.business} className="px-6 py-3 flex justify-between text-sm">
                    <span className="text-gray-400">{t.business} Team Business</span>
                    <span className="font-semibold text-emerald-400">{t.reward}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reward */}
            <div className="rounded-2xl border border-dark-500 bg-dark-800/60 overflow-hidden">
              <div className="px-6 py-4 border-b border-dark-500 bg-dark-700/50">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <TrendingUp className="text-purple-400" size={20} />
                  Power Performance Reward — 4% Pool
                </h3>
              </div>
              <div className="divide-y divide-dark-500">
                {rewardTiers.map((t) => (
                  <div key={t.business} className="px-6 py-3 flex justify-between text-sm">
                    <span className="text-gray-400">{t.business} Team Business</span>
                    <span className="font-semibold text-purple-400">{t.reward}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 60/40 Rule */}
          <div className="mt-10 max-w-2xl mx-auto rounded-xl border border-gold-500/30 bg-gold-500/5 p-6">
            <h4 className="font-semibold text-gold-400 mb-2 flex items-center gap-2">
              <CheckCircle2 size={18} /> 60/40 Business Rule
            </h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              For Salary and Reward qualification: Strong Team maximum 60%, Other Team minimum 40%.
              Example: Target $100,000 → Strong Team $60,000 + Other Team $40,000 = Qualified.
            </p>
          </div>
        </div>
      </section>

      {/* Withdrawal */}
      <section className="py-20 bg-dark-800/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">
              <span className="gradient-text">Withdrawal</span> Rules
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Wallet,
                title: 'Capital Withdrawal',
                desc: 'Any time, subject to available/settled balance',
              },
              {
                icon: TrendingUp,
                title: 'Profit Withdrawal',
                desc: 'Available profit can be withdrawn any time',
              },
              {
                icon: Clock,
                title: 'Request Window',
                desc: '10:30 PM to 12:00 Midnight only',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-dark-500 bg-dark-800/60 p-6 text-center card-hover"
              >
                <item.icon className="mx-auto mb-3 text-gold-400" size={28} />
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-6">No fixed lock-in period</p>
        </div>
      </section>

      {/* Profit Projection Calculator */}
      <ProfitCalculator />

      {/* Disclaimer + CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 mb-10 text-left">
            <h4 className="font-semibold text-red-400 mb-2">⚠️ Important Disclaimer</h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              No profit, Salary, Reward or Level Commission is guaranteed.
              All distributions depend on actual realized profit and the available allocated pools.
              Past performance does not guarantee future results. Trade only with funds you can afford to lose.
            </p>
          </div>

          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-400 mb-8">
            Create your account, verify your email, and start building your team.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold bg-gradient-to-r from-gold-500 to-gold-400 text-dark-900 hover:from-gold-400 hover:to-gold-300 transition-all gold-glow text-lg"
          >
            Start Now <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  );
}
