import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid } from 'recharts'
import { shortDate } from '../lib/format.js'

const axis = { stroke: 'rgba(255,255,255,0.08)', tick: { fill: 'rgba(255,255,255,0.45)', fontSize: 11 }, tickLine: false, axisLine: false }

function Tip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-3 py-2 text-xs" style={{ borderRadius: 10 }}>
      <p className="text-white/55">{labelFormatter ? labelFormatter(label) : label}</p>
      <p className="num text-sm font-semibold text-white">{payload[0].value}</p>
    </div>
  )
}

export function WeeklyBars({ perWeek }) {
  const data = perWeek.map((w) => ({ ...w, label: `wk of ${shortDate(w.weekOf)}` }))
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }} barCategoryGap="28%">
        <XAxis dataKey="label" {...axis} interval={0} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="count" radius={[8, 8, 4, 4]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.count === max ? '#22d3ee' : 'rgba(34,211,238,0.45)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DailyArea({ perDay }) {
  const data = perDay.map((d) => ({ ...d, label: shortDate(d.date) }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="fillAccent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="label" {...axis} minTickGap={24} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip content={<Tip />} />
        <Area type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} fill="url(#fillAccent)" dot={false} activeDot={{ r: 4, fill: '#22d3ee' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function Breakdown({ items, total, colors }) {
  const sum = (total ?? items.reduce((a, b) => a + b.count, 0)) || 1
  return (
    <ul className="space-y-3">
      {items.map((it, i) => {
        const pct = Math.round((it.count / sum) * 100)
        return (
          <li key={it.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-white/75">{it.label}</span>
              <span className="num text-white/55">
                {it.count} <span className="text-white/30">/ {pct}%</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: colors?.[i % colors.length] ?? '#22d3ee' }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function Funnel({ stages, rejected }) {
  const top = stages[0]?.count || 1
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const w = Math.max(8, Math.round((s.count / top) * 100))
        const pct = i === 0 ? '' : `${Math.round((s.count / top) * 100)}%`
        return (
          <div key={s.stage} className="flex items-center gap-3 text-xs">
            <span className="w-16 text-white/60">{s.stage}</span>
            <div className="flex-1">
              <div
                className="flex h-8 items-center rounded-lg pl-3 text-white"
                style={{
                  width: `${w}%`,
                  background: `linear-gradient(90deg, rgba(34,211,238,${0.9 - i * 0.25}), rgba(34,211,238,${0.35 - i * 0.1}))`,
                }}
              >
                <span className="num font-semibold">{s.count}</span>
                {pct && <span className="ml-2 text-white/60">{pct}</span>}
              </div>
            </div>
          </div>
        )
      })}
      <p className="pt-1 text-xs text-white/40">
        <span className="num text-rose-300/80">{rejected}</span> rejections so far. Outcomes are updated by hand.
      </p>
    </div>
  )
}
