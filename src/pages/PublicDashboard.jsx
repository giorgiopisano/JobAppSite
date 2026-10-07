import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Pill, Segmented, Stat } from '../components/Card.jsx'
import Heatmap from '../components/Heatmap.jsx'
import { DailyBars, Breakdown, Funnel, SourceOutcomeMatrix } from '../components/Charts.jsx'
import { dataUrl, longDate, relativeTime, shortDate } from '../lib/format.js'
import {
  channelLabel,
  classicFunnelFrom,
  countBy,
  filterFacts,
  fmtPct,
  perDayFrom,
  ratesFrom,
  sourceOutcomeLinks,
} from '../lib/insights.js'

const DIMS = [
  { value: 'source', label: 'Channel' },
  { value: 'family', label: 'Role' },
  { value: 'region', label: 'Region' },
]
const DIM_LABEL = { source: 'Channel', family: 'Role', region: 'Region' }
const HIDDEN = new Set(['Unspecified', ''])

export default function PublicDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState(null)
  const [dim, setDim] = useState('source')

  useEffect(() => {
    fetch(dataUrl('public.json'), { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch(setError)
  }, [])

  const facts = data?.facts ?? []
  const today = data?.perDay?.at(-1)?.date
  const rows = useMemo(() => filterFacts(facts, filter), [facts, filter])
  const hasOutcomes = useMemo(() => facts.some((f) => f.outcome && f.outcome !== 'Applied'), [facts])

  const slice = useMemo(() => {
    if (!data) return null
    const perDay = filter ? perDayFrom(rows, data.firstDate, today) : data.perDay
    const breakdown = (filter ? countBy(rows, dim) : pickDim(data, dim)).map((it) => ({
      label: dim === 'source' ? channelLabel(it.label) : it.label,
      value: it.label,
      count: it.count,
    }))
    return {
      perDay,
      rates: ratesFrom(rows),
      breakdown: breakdown.filter((it) => !HIDDEN.has(it.value)),
      hiddenCount: breakdown.filter((it) => HIDDEN.has(it.value)).reduce((a, b) => a + b.count, 0),
      funnel: classicFunnelFrom(rows),
      links: sourceOutcomeLinks(rows),
      activeDays: perDay.filter((d) => d.count > 0).length,
    }
  }, [data, filter, rows, dim, today])

  function toggleFilter(d, value) {
    setFilter((prev) => (prev?.dim === d && prev?.value === value ? null : { dim: d, value }))
  }

  if (error) return <Empty title="Couldn't load data" body={String(error.message)} />
  if (!data || !slice) return <Empty title="Loading" body="Fetching the latest numbers." />

  const t = data.totals
  const r = slice.rates
  const retry = (t.blocked ?? 0) + (t.incomplete ?? 0)
  const attempts = t.submitted + retry
  const pace = filter ? (slice.activeDays ? (r.submitted / slice.activeDays).toFixed(1) : '0') : t.perActiveDay

  return (
    <div className="space-y-10">
      <section className="rise">
        <p className="text-[15px] font-medium text-muted">Entry-level cybersecurity search</p>
        <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
          <h1 className="headline num text-[72px] font-semibold sm:text-[96px]">{r.submitted}</h1>
          <p className="pb-3 text-xl font-medium tracking-tight sm:pb-4 sm:text-2xl">
            applications submitted
            {filter && <span className="text-muted"> of {t.submitted}</span>}
          </p>
        </div>
        <p className="mt-4 text-[15px] text-muted">
          {t.streak > 0 ? `${t.streak}-day streak` : `Best streak ${t.bestStreak} days`} · {pace} per active day · since{' '}
          {shortDate(data.firstDate)} · updated {relativeTime(data.generatedAt)}
        </p>
        {filter && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Pill active>
              {DIM_LABEL[filter.dim]}: {filter.dim === 'source' ? channelLabel(filter.value) : filter.value}
            </Pill>
            <Pill tone="ink" onClick={() => setFilter(null)}>
              Clear filter
            </Pill>
          </div>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Active days"
          value={filter ? slice.activeDays : t.activeDays}
          hint={`of ${t.daysElapsed} days since start`}
          delay={40}
        />
        <Stat
          label="Best day"
          value={t.bestDay?.count ?? 0}
          hint={t.bestDay ? longDate(t.bestDay.date) : '—'}
          delay={80}
        />
        <Stat
          as={Link}
          to="/private?status=retry"
          label="Needs retry"
          value={retry}
          tone={retry ? 'warn' : undefined}
          hint={`${t.blocked ?? 0} blocked · ${t.incomplete ?? 0} incomplete · ${fmtPct(retry, attempts || 1)} of attempts →`}
          delay={120}
        />
      </div>

      <Card title="Daily applications" subtitle="Click a day to open its applications" delay={160}>
        <DailyBars perDay={slice.perDay} onBarClick={(d) => d?.date && navigate(`/private?date=${d.date}`)} />
      </Card>

      <Card
        title="Where applications go"
        subtitle="Click a row to filter the page"
        delay={200}
        action={<Segmented options={DIMS} value={dim} onChange={setDim} label="Breakdown" />}
      >
        <Breakdown
          items={slice.breakdown}
          total={r.submitted}
          dim={dim}
          activeLabel={filter?.dim === dim ? filter.value : null}
          onSelect={toggleFilter}
        />
        {slice.hiddenCount > 0 && (
          <p className="mt-3 text-xs text-faint">{slice.hiddenCount} without a {DIM_LABEL[dim].toLowerCase()} not shown.</p>
        )}
      </Card>

      {hasOutcomes ? (
        <Card title="Outcomes" subtitle="Submitted → Interview → Offer" delay={240}>
          <Funnel stages={slice.funnel} rejected={r.rejected} />
          {slice.links.some((l) => l.outcome !== 'Applied') && (
            <div className="mt-6">
              <p className="mb-2 text-[13px] font-semibold">By channel</p>
              <SourceOutcomeMatrix links={slice.links} sourceLabel={channelLabel} />
            </div>
          )}
        </Card>
      ) : (
        <section className="tile rise flex flex-wrap items-baseline justify-between gap-2 px-6 py-5 sm:px-7" style={{ animationDelay: '240ms' }}>
          <h2 className="text-[17px] font-semibold tracking-tight">Outcomes</h2>
          <p className="text-[13px] text-muted">
            No outcomes tagged yet. Tag Interview, Offer, or Rejected in the Apply log to see conversion.
          </p>
        </section>
      )}

      <Card title="Activity" subtitle={`${shortDate(data.firstDate)} to ${shortDate(data.lastDate ?? today)}`} delay={280}>
        <Heatmap perDay={slice.perDay} onDayClick={(day) => day?.date && navigate(`/private?date=${day.date}`)} />
      </Card>
    </div>
  )
}

function pickDim(data, dim) {
  if (dim === 'source') return data.bySource
  if (dim === 'family') return data.byRoleFamily
  return data.byRegion
}

function Empty({ title, body }) {
  return (
    <div className="tile rise mx-auto max-w-md p-8 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      <p className="mt-1 text-[13px] text-muted">{body}</p>
    </div>
  )
}
