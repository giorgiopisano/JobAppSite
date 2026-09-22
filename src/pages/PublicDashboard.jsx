import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Kpi, Pill } from '../components/Card.jsx'
import Heatmap from '../components/Heatmap.jsx'
import {
  WeeklyBars,
  DailyArea,
  Breakdown,
  OutcomeFlow,
  ApplicationFunnel,
  SourceOutcomeMatrix,
} from '../components/Charts.jsx'
import { dataUrl, longDate, monthLabel, relativeTime, shortDate } from '../lib/format.js'
import {
  buildInsightLine,
  channelLabel,
  classicFunnelFrom,
  countBy,
  filterFacts,
  fmtPct,
  outcomeFlowFrom,
  perDayFrom,
  perWeekFrom,
  ratesFrom,
  sourceOutcomeLinks,
} from '../lib/insights.js'

const PALETTE = ['#3dd6f5', '#7dd3fc', '#67e8f9', '#38bdf8', '#a5f3fc', '#94a3b8']

const DIM_LABEL = { source: 'Channel', family: 'Role', region: 'Region', outcome: 'Outcome' }

export default function PublicDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState(null)

  useEffect(() => {
    fetch(dataUrl('public.json'), { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch(setError)
  }, [])

  const facts = data?.facts ?? []
  const today = data?.perDay?.at(-1)?.date

  const filteredFacts = useMemo(() => {
    if (!filter) return facts
    if (filter.dim === 'outcome') {
      if (filter.value === 'Submitted') return facts
      return facts.filter((f) => f.outcome === filter.value)
    }
    return filterFacts(facts, filter)
  }, [facts, filter])

  const slice = useMemo(() => {
    if (!data) return null
    const usingFilter = Boolean(filter)
    const rows = filteredFacts
    const rates = ratesFrom(rows)
    const firstDate = data.firstDate
    const perDay = usingFilter ? perDayFrom(rows, firstDate, today) : data.perDay
    const perWeek = usingFilter ? perWeekFrom(perDay) : data.perWeek
    const bySourceRaw = usingFilter ? countBy(rows, 'source') : data.bySource
    const bySource = bySourceRaw.map((it) => ({
      label: channelLabel(it.label),
      value: it.label,
      count: it.count,
    }))
    const funnel = usingFilter ? classicFunnelFrom(rows) : normalizeFunnel(data.funnel, rates)
    return {
      rates,
      perDay,
      perWeek,
      bySource,
      byRoleFamily: usingFilter ? countBy(rows, 'family') : data.byRoleFamily,
      byRegion: usingFilter ? countBy(rows, 'region') : data.byRegion,
      outcomeFlow: usingFilter ? outcomeFlowFrom(rows) : data.outcomeFlow ?? outcomeFlowFrom(rows),
      funnel,
      links: sourceOutcomeLinks(rows),
      insight: buildInsightLine(rows, bySourceRaw),
      funnelInsight: funnelInsight(rates),
      status: (usingFilter ? [] : data.byStatus).filter((s) => s.label !== 'Skipped'),
    }
  }, [data, filter, filteredFacts, today])

  function toggleFilter(dim, value) {
    setFilter((prev) => (prev?.dim === dim && prev?.value === value ? null : { dim, value }))
  }

  if (error) return <Empty title="Couldn't load data" body={String(error.message)} />
  if (!data || !slice) return <Empty title="Loading" body="Fetching the latest numbers." />

  const t = data.totals
  const r = slice.rates
  const offerRate = fmtPct(r.offered, r.submitted || 1)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Career Track</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Job Hunt Overview</h1>
          <p className="mt-1 text-sm text-white/50">Track progress, analyze channels, stay focused.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="accent">{t.streak}-day streak</Pill>
          <Pill>{relativeTime(data.generatedAt)}</Pill>
          {filter && (
            <>
              <Pill tone="accent" active>
                {DIM_LABEL[filter.dim] ?? filter.dim}:{' '}
                {filter.dim === 'source' ? channelLabel(filter.value) : filter.value}
              </Pill>
              <Pill onClick={() => setFilter(null)}>Clear filter</Pill>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Applications"
          value={filter ? r.submitted : t.thisMonth}
          hint={filter ? `${t.submitted} total all time` : `${monthLabel(t.thisMonthLabel)} · ${t.submitted} total`}
          icon={<IconPlane />}
          delay={40}
          activeDots={3}
        />
        <Kpi
          label="Interviews"
          value={r.interviewed}
          hint={`${fmtPct(r.interviewed, r.submitted || 1)} of submitted`}
          icon={<IconCal />}
          delay={80}
          activeDots={r.interviewed ? 2 : 1}
        />
        <Kpi
          label="Offers"
          value={r.offered}
          hint={r.offered ? 'From tagged outcomes' : 'Tag Offer on Apply log'}
          icon={<IconStar />}
          delay={120}
          activeDots={r.offered ? 3 : 1}
        />
        <Kpi
          label="Offer rate"
          value={offerRate}
          hint={`${r.offered} of ${r.submitted || 0} submitted`}
          icon={<IconPie />}
          delay={160}
          activeDots={r.offered ? 2 : 1}
        />
      </div>

      <p className="rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-white/65 ring-1 ring-white/8">
        <span className="mr-2 text-accent">Insight</span>
        {slice.insight}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Application funnel"
          subtitle="Submitted → Interview → Offer"
          delay={200}
          action={<span className="text-[11px] text-white/35">Conversion rate</span>}
        >
          <ApplicationFunnel
            stages={slice.funnel}
            activeStage={filter?.dim === 'outcome' ? filter.value : null}
            onSelect={toggleFilter}
            insight={slice.funnelInsight}
          />
        </Card>
        <Card
          title="Applications by channel"
          subtitle="Hover a channel to filter applications"
          delay={250}
        >
          <Breakdown
            items={slice.bySource}
            colors={PALETTE}
            dim="source"
            activeLabel={filter?.dim === 'source' ? filter.value : null}
            onSelect={toggleFilter}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Activity overview" subtitle="Submitted applications by week" className="lg:col-span-3" delay={300}>
          <WeeklyBars perWeek={slice.perWeek} />
        </Card>
        <Card title="Daily rhythm" subtitle={`${shortDate(data.firstDate)} to today`} className="lg:col-span-2" delay={350}>
          <DailyArea perDay={slice.perDay} />
        </Card>
      </div>

      <Card title="Activity" subtitle="Click a day to open Applications for that date" delay={400}>
        <Heatmap
          perDay={slice.perDay}
          onDayClick={(day) => {
            if (!day?.date) return
            navigate(`/private?date=${day.date}`)
          }}
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="By role family" subtitle="Click a bar to filter" delay={450}>
          <Breakdown
            items={slice.byRoleFamily}
            colors={PALETTE}
            dim="family"
            activeLabel={filter?.dim === 'family' ? filter.value : null}
            onSelect={toggleFilter}
          />
        </Card>
        <Card title="By region" subtitle="Where the role sits" delay={500}>
          <Breakdown
            items={slice.byRegion}
            colors={PALETTE}
            dim="region"
            activeLabel={filter?.dim === 'region' ? filter.value : null}
            onSelect={toggleFilter}
          />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Outcome split" subtitle="Where applications land after submit" delay={550}>
          <OutcomeFlow
            stages={slice.outcomeFlow}
            activeStage={filter?.dim === 'outcome' ? filter.value : null}
            onSelect={toggleFilter}
          />
        </Card>
        <Card title="Channel → outcome" subtitle="What's hitting by apply channel" delay={600}>
          <SourceOutcomeMatrix links={slice.links} total={r.submitted} sourceLabel={channelLabel} />
          {!filter && slice.status?.length > 0 && (
            <div className="mt-5 border-t border-white/8 pt-4">
              <p className="mb-3 text-xs font-semibold text-white/70">Attempt status</p>
              <Breakdown items={slice.status} colors={['#34d399', '#fb7185', '#fbbf24']} />
            </div>
          )}
        </Card>
      </div>

      {data.perMonth.length > 1 && !filter && (
        <Card title="By month" delay={650}>
          <Breakdown items={data.perMonth.map((m) => ({ label: monthLabel(m.month), count: m.count }))} colors={PALETTE} />
        </Card>
      )}

      <p className="px-1 text-center text-xs text-white/40">
        Public page shows aggregates only.{' '}
        <Link to="/private" className="text-accent/80 hover:text-accent">
          Applications
        </Link>{' '}
        unlocks encrypted company and role rows in your browser.
      </p>
    </div>
  )
}

function normalizeFunnel(funnel, rates) {
  if (funnel?.length) {
    return funnel.map((s) =>
      s.stage === 'Applied' ? { ...s, stage: 'Submitted' } : s,
    )
  }
  return [
    { stage: 'Submitted', count: rates.submitted },
    { stage: 'Interview', count: rates.interviewed },
    { stage: 'Offer', count: rates.offered },
  ]
}

function funnelInsight(rates) {
  if (!rates.submitted) return 'No submissions in this slice yet.'
  if (!rates.interviewed) {
    return 'No interviews tagged yet — conversion stays flat until Outcomes move past Applied.'
  }
  if (rates.offered && rates.interviewed) {
    return `Conversion from interview to offer is ${fmtPct(rates.offered, rates.interviewed)} this slice.`
  }
  return `Interview rate is ${fmtPct(rates.interviewed, rates.submitted)} of submitted.`
}

function Empty({ title, body }) {
  return (
    <div className="glass rise mx-auto max-w-md p-8 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-white/50">{body}</p>
    </div>
  )
}

function IconPlane() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 8.2 14 3.5 9.2 13 7.6 9.1 2 8.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function IconCal() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function IconStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2.5l1.5 3.2 3.5.4-2.6 2.4.7 3.4L8 10.4 4.9 11.9l.7-3.4L3 6.1l3.5-.4L8 2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPie() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 2.8V8l3.8 3.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
