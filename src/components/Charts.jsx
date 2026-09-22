import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts'
import { shortDate } from '../lib/format.js'
import { fmtPct } from '../lib/insights.js'

const axis = {
  stroke: 'rgba(255,255,255,0.08)',
  tick: { fill: 'rgba(255,255,255,0.45)', fontSize: 11 },
  tickLine: false,
  axisLine: false,
}

function Tip({ active, payload, label, labelFormatter, extra }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass px-3 py-2 text-xs shadow-lg shadow-black/40" style={{ borderRadius: 10 }}>
      <p className="text-white/55">{labelFormatter ? labelFormatter(label) : label}</p>
      <p className="num text-sm font-semibold text-white">{payload[0].value}</p>
      {extra?.(payload[0]?.payload)}
    </div>
  )
}

export function WeeklyBars({ perWeek, onBarClick, activeWeek }) {
  const data = perWeek.map((w) => ({ ...w, label: `wk of ${shortDate(w.weekOf)}` }))
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="label" {...axis} interval={0} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip
          content={<Tip />}
          cursor={{ fill: 'rgba(34,211,238,0.08)' }}
          animationDuration={80}
        />
        <Bar
          dataKey="count"
          radius={[8, 8, 4, 4]}
          cursor={onBarClick ? 'pointer' : 'default'}
          onClick={(d) => onBarClick?.(d)}
        >
          {data.map((d, i) => {
            const active = activeWeek && d.weekOf === activeWeek
            return (
              <Cell
                key={i}
                fill={active || d.count === max ? '#22d3ee' : 'rgba(34,211,238,0.45)'}
                fillOpacity={activeWeek && !active ? 0.35 : 1}
              />
            )
          })}
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
        <Tooltip content={<Tip />} animationDuration={80} cursor={{ stroke: 'rgba(34,211,238,0.35)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#22d3ee"
          strokeWidth={2}
          fill="url(#fillAccent)"
          dot={false}
          activeDot={{ r: 5, fill: '#22d3ee', stroke: '#070a12', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function Breakdown({ items, total, colors, activeLabel, onSelect, dim }) {
  const sum = (total ?? items.reduce((a, b) => a + b.count, 0)) || 1
  return (
    <ul className="space-y-3">
      {items.map((it, i) => {
        const pct = Math.round((it.count / sum) * 100)
        const active = activeLabel === it.label
        const muted = activeLabel && !active
        return (
          <li key={it.label}>
            <button
              type="button"
              onClick={() => onSelect?.(dim, it.label)}
              className={`group w-full rounded-lg text-left transition ${onSelect ? 'cursor-pointer hover:bg-white/[0.03]' : 'cursor-default'} ${active ? 'bg-accent/10 ring-1 ring-accent/30' : ''} px-1.5 py-1 -mx-1.5`}
            >
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className={`transition ${muted ? 'text-white/35' : 'text-white/75'} ${active ? 'text-accent' : ''}`}>
                  {it.label}
                </span>
                <span className={`num ${muted ? 'text-white/25' : 'text-white/55'}`}>
                  {it.count} <span className="text-white/30">/ {pct}%</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                <div
                  className="h-full rounded-full transition-all duration-500 group-hover:brightness-125"
                  style={{
                    width: `${pct}%`,
                    background: colors?.[i % colors.length] ?? '#22d3ee',
                    opacity: muted ? 0.35 : 1,
                  }}
                />
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

const FLOW_COLORS = {
  Submitted: '#22d3ee',
  Applied: '#67e8f9',
  Rejected: '#fb7185',
  Interview: '#fbbf24',
  Offer: '#34d399',
}

/** Interactive outcome flow: Submitted splits into Applied / Rejected / Interview / Offer. */
export function OutcomeFlow({ stages, onSelect, activeStage }) {
  const submitted = stages.find((s) => s.stage === 'Submitted')?.count || 0
  const branches = stages.filter((s) => s.stage !== 'Submitted')
  const top = Math.max(submitted, 1)

  return (
    <div className="space-y-3">
      <FlowRow
        stage="Submitted"
        count={submitted}
        widthPct={100}
        pctLabel="100%"
        active={activeStage === 'Submitted'}
        muted={activeStage && activeStage !== 'Submitted'}
        onClick={() => onSelect?.('outcome', 'Submitted')}
      />
      <div className="relative ml-2 border-l border-white/10 pl-4 space-y-2">
        {branches.map((s) => {
          const w = Math.max(10, Math.round((s.count / top) * 100))
          return (
            <FlowRow
              key={s.stage}
              stage={s.stage}
              count={s.count}
              widthPct={w}
              pctLabel={fmtPct(s.count, top)}
              active={activeStage === s.stage}
              muted={activeStage && activeStage !== s.stage}
              onClick={() => onSelect?.('outcome', s.stage)}
            />
          )
        })}
      </div>
      <p className="pt-1 text-xs text-white/40">
        Click a stage to filter the dashboard. Outcomes are tagged by hand on the Apply log.
      </p>
    </div>
  )
}

function FlowRow({ stage, count, widthPct, pctLabel, active, muted, onClick }) {
  const color = FLOW_COLORS[stage] ?? '#22d3ee'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg px-1 py-0.5 text-left text-xs transition hover:bg-white/[0.03] ${active ? 'ring-1 ring-accent/35 bg-accent/5' : ''}`}
    >
      <span className={`w-20 shrink-0 ${muted ? 'text-white/30' : 'text-white/60'} ${active ? 'text-accent' : ''}`}>
        {stage}
      </span>
      <div className="flex-1">
        <div
          className="flex h-8 items-center rounded-lg pl-3 text-white transition duration-300 group-hover:brightness-110"
          style={{
            width: `${widthPct}%`,
            minWidth: '3.5rem',
            background: `linear-gradient(90deg, ${color}, ${color}66)`,
            opacity: muted ? 0.35 : 1,
            boxShadow: active ? `0 0 20px ${color}55` : undefined,
          }}
        >
          <span className="num font-semibold">{count}</span>
          <span className="ml-2 text-white/70">{pctLabel}</span>
        </div>
      </div>
    </button>
  )
}

/** Compact Source → Outcome link list (Sankey-lite). */
export function SourceOutcomeMatrix({ links, total }) {
  const sum = total || links.reduce((a, b) => a + b.count, 0) || 1
  if (!links.length) {
    return <p className="text-xs text-white/45">No source/outcome pairs yet.</p>
  }
  return (
    <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
      {links
        .slice()
        .sort((a, b) => b.count - a.count)
        .map((l) => (
          <li key={`${l.source}-${l.outcome}`} className="flex items-center gap-2 text-xs">
            <span className="w-[30%] truncate text-white/65">{l.source}</span>
            <span className="text-white/25">→</span>
            <span className="w-[28%] truncate text-white/65">{l.outcome}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full bg-accent/70 transition-all duration-500"
                style={{ width: `${Math.max(6, Math.round((l.count / sum) * 100))}%` }}
              />
            </div>
            <span className="num w-8 text-right text-white/50">{l.count}</span>
          </li>
        ))}
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
                className="flex h-8 items-center rounded-lg pl-3 text-white transition hover:brightness-110"
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
