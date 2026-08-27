import { useState, useMemo, useCallback } from 'react';
import { TrendingUp, Calculator, AlertTriangle, ChevronRight } from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Format a number as USD currency (no decimals for large values). */
function fmt(value) {
  if (value >= 1_000_000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Compound growth with monthly top-up at the start of each month.
 *
 * Each month:
 *   1. Add top-up to the current balance
 *   2. Apply the monthly rate: balance *= (1 + rate)
 *
 * @param {number} principal   – starting deposit
 * @param {number} topUp       – monthly top-up amount
 * @param {number} ratePercent – monthly return rate (%)
 * @param {number} months      – number of months to project
 * @returns {{ month: number, balance: number }[]} – one entry per month (month 0 = start)
 */
function projectGrowth(principal, topUp, ratePercent, months) {
  const r = ratePercent / 100;
  const series = [{ month: 0, balance: principal }];
  let balance = principal;
  for (let m = 1; m <= months; m++) {
    balance = (balance + topUp) * (1 + r);
    series.push({ month: m, balance });
  }
  return series;
}

// ─── custom slider component ─────────────────────────────────────────────────

/**
 * A styled range slider that fills the track up to the thumb with a gold gradient.
 */
function Slider({ id, label, min, max, step, value, onChange, format }) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <label htmlFor={id} className="text-sm font-medium text-gray-300">
          {label}
        </label>
        <span className="text-gold-400 font-bold text-base tabular-nums">
          {format(value)}
        </span>
      </div>

      {/* Track wrapper */}
      <div className="relative h-2 rounded-full bg-dark-500">
        {/* Filled portion */}
        <div
          className="absolute top-0 left-0 h-2 rounded-full pointer-events-none"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #0a8078 0%, #19E6D2 100%)',
          }}
        />
        {/* Native input — invisible but functional */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
          aria-label={label}
        />
        {/* Visible thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-gold-400 bg-dark-800 shadow pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}

// ─── milestone card ───────────────────────────────────────────────────────────

function MilestoneCard({ month, balance, totalDepositedAtMonth, highlighted }) {
  // Multiplier vs total deposited at that point in time (deposit + top-ups so far)
  const multiplier = totalDepositedAtMonth > 0 ? balance / totalDepositedAtMonth : 1;
  return (
    <div
      className={`rounded-xl border p-4 text-center transition-all duration-300 ${
        highlighted
          ? 'border-gold-400 bg-dark-700/80 gold-glow'
          : 'border-dark-500 bg-dark-800/60'
      }`}
    >
      <div className="text-xs text-gray-500 mb-1 font-medium">Month {month}</div>
      <div
        className={`text-lg font-extrabold tabular-nums ${
          highlighted ? 'text-gold-400' : 'text-white'
        }`}
      >
        {fmt(balance)}
      </div>
      <div className="text-xs text-emerald-400 mt-1 font-medium">
        {multiplier.toFixed(2)}× deposited
      </div>
    </div>
  );
}

// ─── mini bar chart ───────────────────────────────────────────────────────────

/** Simple bar chart showing quarterly snapshots across the projection period. */
function GrowthChart({ series, months }) {
  // Pick ~8 evenly-spaced data points for the bars
  const step = Math.max(1, Math.ceil(months / 8));
  const points = [];
  for (let m = 0; m <= months; m += step) points.push(series[m]);
  if (points[points.length - 1].month !== months) points.push(series[months]);

  const maxBalance = Math.max(...points.map((p) => p.balance));

  return (
    <div className="flex items-end gap-1 h-24 mt-4">
      {points.map((p) => {
        const heightPct = (p.balance / maxBalance) * 100;
        return (
          <div key={p.month} className="flex-1 flex flex-col items-center gap-1 group">
            {/* Tooltip */}
            <div className="hidden group-hover:block absolute -mt-8 text-xs bg-dark-600 border border-dark-500 rounded px-1.5 py-0.5 text-gold-400 whitespace-nowrap pointer-events-none z-10">
              M{p.month}: {fmt(p.balance)}
            </div>
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{
                height: `${heightPct}%`,
                background: `linear-gradient(180deg, #19E6D2 0%, #065851 100%)`,
                opacity: 0.7 + 0.3 * (heightPct / 100),
              }}
            />
            <span className="text-[9px] text-gray-600">{p.month}m</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ProfitCalculator() {
  // ── state ──
  const [deposit, setDeposit]     = useState(5000);
  const [topUp, setTopUp]         = useState(500);
  const [months, setMonths]       = useState(12);
  const [rate, setRate]           = useState(4); // illustrative monthly return %

  // Milestone months — capped to the chosen horizon
  const milestones = useMemo(
    () => [1, 3, 6, 12].filter((m) => m <= months).concat(months === 1 || months === 3 || months === 6 || months === 12 ? [] : [months]),
    [months],
  );

  // ── projection data ──
  const series = useMemo(
    () => projectGrowth(deposit, topUp, rate, months),
    [deposit, topUp, months, rate],
  );

  const finalBalance   = series[months].balance;
  // Multiplier is always against total deposited (deposit + all top-ups),
  // so it reflects actual capital put in — not just the opening amount.
  const totalDeposited = deposit + topUp * months;
  const totalProfit    = finalBalance - totalDeposited;
  const multiplier     = totalDeposited > 0 ? finalBalance / totalDeposited : 1;

  // Handler wrapped in useCallback to avoid extra renders
  const handleDeposit = useCallback((v) => setDeposit(v), []);
  const handleTopUp   = useCallback((v) => setTopUp(v),   []);
  const handleMonths  = useCallback((v) => setMonths(v),  []);
  const handleRate    = useCallback((v) => setRate(v),    []);

  return (
    <section id="calculator" className="py-20 bg-dark-800/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-400 text-xs font-medium mb-4">
            <Calculator size={14} />
            Profit Projection Calculator
          </div>
          <h2 className="text-3xl font-bold mb-3">
            See How Your Capital Could <span className="gradient-text">Grow</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm leading-relaxed">
            Adjust the sliders to model different scenarios. This is a mathematical illustration
            using compound monthly growth — not a prediction or guarantee.
          </p>
        </div>

        {/* Main grid: controls + results */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">

          {/* ── Left: Sliders ── */}
          <div className="rounded-2xl border border-dark-500 bg-dark-800/60 p-6 sm:p-8 space-y-8">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
              <TrendingUp className="text-gold-400" size={20} />
              Configure Your Scenario
            </h3>

            <Slider
              id="deposit"
              label="Starting Deposit"
              min={100}
              max={100000}
              step={100}
              value={deposit}
              onChange={handleDeposit}
              format={(v) => fmt(v)}
            />

            <Slider
              id="topup"
              label="Monthly Top-up"
              min={0}
              max={10000}
              step={50}
              value={topUp}
              onChange={handleTopUp}
              format={(v) => fmt(v)}
            />

            <Slider
              id="months"
              label="Time Horizon"
              min={1}
              max={36}
              step={1}
              value={months}
              onChange={handleMonths}
              format={(v) => `${v} month${v === 1 ? '' : 's'}`}
            />

            <Slider
              id="rate"
              label="Illustrative Monthly Return"
              min={1}
              max={8}
              step={0.5}
              value={rate}
              onChange={handleRate}
              format={(v) => `${v}% / mo`}
            />

            {/* Rate note */}
            <p className="text-xs text-gray-500 leading-relaxed border-l-2 border-gold-500/30 pl-3">
              The monthly return slider is for illustration only. Our packages show indicative
              daily ranges; actual results depend on market conditions and are never guaranteed.
            </p>
          </div>

          {/* ── Right: Results ── */}
          <div className="space-y-5">

            {/* Hero result card */}
            <div className="rounded-2xl border border-gold-400/40 bg-gradient-to-br from-dark-700/80 to-dark-800/80 p-6 sm:p-8 gold-glow">
              <div className="text-sm text-gray-400 mb-1">Projected value after {months} month{months === 1 ? '' : 's'}</div>
              <div className="text-4xl sm:text-5xl font-extrabold gradient-text tabular-nums leading-tight">
                {fmt(finalBalance)}
              </div>

              <div className="mt-4 flex flex-wrap gap-4">
                {/* Multiplier badge — vs total deposited */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-500/10 border border-gold-500/30">
                  <ChevronRight className="text-gold-400" size={16} />
                  <span className="text-gold-400 font-bold text-lg tabular-nums">
                    {multiplier.toFixed(2)}×
                  </span>
                  <span className="text-gray-400 text-sm">total deposited</span>
                </div>
              </div>

              {/* Summary row */}
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-dark-800/60 border border-dark-500 p-3">
                  <div className="text-gray-500 mb-0.5">Total Deposited</div>
                  <div className="font-semibold text-white tabular-nums">{fmt(totalDeposited)}</div>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
                  <div className="text-gray-500 mb-0.5">Projected Profit</div>
                  <div className="font-semibold text-emerald-400 tabular-nums">{fmt(totalProfit)}</div>
                </div>
              </div>

              {/* Mini bar chart */}
              <GrowthChart series={series} months={months} />
            </div>

            {/* Milestone cards */}
            <div>
              <div className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-medium">
                Key milestones
              </div>
              <div
                className={`grid gap-3 ${
                  milestones.length === 1
                    ? 'grid-cols-1'
                    : milestones.length === 2
                    ? 'grid-cols-2'
                    : milestones.length === 3
                    ? 'grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-4'
                }`}
              >
                {milestones.map((m) => (
                  <MilestoneCard
                    key={m}
                    month={m}
                    balance={series[m]?.balance ?? 0}
                    totalDepositedAtMonth={deposit + topUp * m}
                    highlighted={m === months}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-12 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-amber-400 mb-2">
                Illustrative Projection — Not a Guarantee
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                These figures are a mathematical projection based on a hypothetical fixed monthly return
                applied via compound interest. They are provided for illustrative purposes only and do
                not represent a forecast, promise, or guarantee of any kind. Past performance does not
                guarantee future results. Actual returns will vary based on market conditions, trading
                outcomes, and other factors. No percentage of profit is ever guaranteed. You may lose
                part or all of your invested capital. Only invest what you can afford to lose.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
