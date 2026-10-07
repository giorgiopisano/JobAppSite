import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts'
import { longDate, shortDate } from '../lib/format.js'
import { fmtPct } from '../lib/insights.js'

const INK = '#1d1d1f'
const INK_SOFT = '#c7c7cc'

const axis = {
  tick: { fill: '#86868b', fontSize: 11 },
  tickLine: false,
  axisLine: false,
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
      <p className="text-muted">{longDate(label)}</p>
      <p className="num text-sm font-semibold">{payload[0].value} applications</p>
    </div>
  )
}

/** Single daily chart; the latest and best days are drawn in full ink. */
export function DailyBars({ perDay, onBarClick }) {
  const max = Math.max(1, ...perDay.map((d) => d.count))
  const last = perDay.at(-1)?.date
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={perDay} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke="#e8e8ed" />
        <XAxis dataKey="date" {...axis} tickFormatter={shortDate} minTickGap={28} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip content={<Tip />} animationDuration={80} />
        <Bar
          dataKey="count"
          radius={[5, 5, 1, 1]}
          cursor={onBarClick ? 'pointer' : 'default'}
          onClick={(d) => onBarClick?.(d)}
        >
          {perDay.map((d) => (
            <Cell key={d.date} fill={d.count === max || d.date === last ? INK : INK_SOFT} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Monochrome bar list. Click a row to toggle a page filter. */
export function Breakdown({ items, total, activeLabel, onSelect, dim }) {
  const sum = (total ?? items.reduce((a, b) => a + b.count, 0)) || 1
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <ul className="divide-y divide-hair">
      {items.map((it) => {
        const filterValue = it.value ?? it.label
        const active = activeLabel === filterValue
        const muted = activeLabel && !active
        const Row = onSelect ? 'button' : 'div'
        return (
          <li key={filterValue}>
            <Row
              type={onSelect ? 'button' : undefined}
              onClick={onSelect ? () => onSelect(dim, filterValue) : undefined}
              aria-pressed={onSelect ? active : undefined}
              className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-2.5 text-left text-sm transition sm:grid-cols-[minmax(0,11rem)_1fr_auto] ${
                muted ? 'opacity-40' : ''
              } ${onSelect ? 'cursor-pointer hover:opacity-70' : ''}`}
            >
              <span className={`truncate ${active ? 'font-semibold' : ''}`}>{it.label}</span>
              <span className="order-last col-span-2 h-1.5 overflow-hidden rounded-full bg-hair sm:order-none sm:col-span-1">
                <span
                  className="block h-full rounded-full bg-ink transition-all duration-500"
                  style={{ width: `${Math.max(2, (it.count / max) * 100)}%` }}
                />
              </span>
              <span className="num w-20 text-right text-muted">
                <span className="font-medium text-ink">{it.count}</span> · {Math.round((it.count / sum) * 100)}%
              </span>
            </Row>
          </li>
        )
      })}
    </ul>
  )
}

/** Horizontal Submitted → Interview → Offer funnel with step rates. */
export function Funnel({ stages, rejected }) {
  const top = stages[0]?.count || 1
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {stages.map((s, i) => {
          const prev = stages[i - 1]?.count
          return (
            <div key={s.stage} className="rounded-2xl bg-page p-4">
              <p className="label">{s.stage}</p>
              <p className="num mt-1 text-2xl font-semibold">{s.count}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-hair">
                <div className="h-full rounded-full bg-ink" style={{ width: `${Math.max(2, (s.count / top) * 100)}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted">{i === 0 ? 'All submitted' : `${fmtPct(s.count, prev || 1)} of ${stages[i - 1].stage.toLowerCase()}`}</p>
            </div>
          )
        })}
      </div>
      {rejected > 0 && (
        <p className="text-xs text-muted">
          <span className="num font-medium text-bad">{rejected}</span> rejected so far.
        </p>
      )}
    </div>
  )
}

/** Channel → outcome pairs, only shown once outcomes are tagged. */
export function SourceOutcomeMatrix({ links, sourceLabel }) {
  const labelOf = sourceLabel ?? ((s) => s)
  const rows = links.filter((l) => l.outcome !== 'Applied').sort((a, b) => b.count - a.count)
  if (!rows.length) return null
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <ul className="divide-y divide-hair">
      {rows.map((l) => (
        <li key={`${l.source}-${l.outcome}`} className="grid grid-cols-[minmax(0,10rem)_6rem_1fr_2rem] items-center gap-3 py-2 text-sm">
          <span className="truncate">{labelOf(l.source)}</span>
          <span className="text-muted">{l.outcome}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-hair">
            <span className="block h-full rounded-full bg-ink" style={{ width: `${(l.count / max) * 100}%` }} />
          </span>
          <span className="num text-right text-muted">{l.count}</span>
        </li>
      ))}
    </ul>
  )
}
