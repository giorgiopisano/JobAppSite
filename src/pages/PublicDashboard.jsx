import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Stat, Pill } from '../components/Card.jsx'
import Heatmap from '../components/Heatmap.jsx'
import { WeeklyBars, DailyArea, Breakdown, OutcomeFlow, SourceOutcomeMatrix } from '../components/Charts.jsx'
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

const PALETTE = ['#22d3ee', '#818cf8', '#34d399', '#fbbf24', '#f472b6', '#94a3b8']

const DIM_LABEL = { source: 'Channel', family: 'Role', region: 'Region', outcome: 'Outcome' }

export default function PublicDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState(null) // { dim, value } | null

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
    return {
      rates,
      perDay,
      perWeek,
      bySource: (usingFilter ? countBy(rows, 'source') : data.bySource).map((it) => ({
        ...it,
        value: it.label,
        label: channelLabel(it.label),
      })),
      byRoleFamily: usingFilter ? countBy(rows, 'family') : data.byRoleFamily,
      byRegion: usingFilter ? countBy(rows, 'region') : data.byRegion,
      outcomeFlow: usingFilter ? outcomeFlowFrom(rows) : data.outcomeFlow ?? outcomeFlowFrom(rows),
      funnel: usingFilter ? classicFunnelFrom(rows) : data.funnel,
      links: sourceOutcomeLinks(rows).map((l) => ({ ...l, sourceLabel: channelLabel(l.source) })),
      insight: buildInsightLine(rows, usingFilter ? countBy(rows, 'source') : data.bySource),
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
  const sinceDays = t.daysElapsed

  return (
    <div className="space-y-5">
      <section
        className="glass glass-hover rise relative overflow-hidden p-6 sm:p-8"
        onMouseMove={spotMove}
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">{monthLabel(t.thisMonthLabel)} so far</p>
            <p className="num glow mt-2 text-7xl font-extrabold leading-none text-accent sm:text-8xl">
              {filter ? r.submitted : t.thisMonth}
            </p>
            <p className="mt-3 text-sm text-white/60">
              {filter ? (
                <>
                  applications in this slice.{' '}
                  <span className="text-white/85">{t.submitted}</span> total since {longDate(data.firstDate)}.
                </>
              ) : (
                <>
                  applications submitted this month.{' '}
                  <span className="text-white/85">{t.submitted}</span> total since {longDate(data.firstDate)}.
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Pill tone="accent">{t.streak}-day streak</Pill>
            <Pill tone="green">{t.perActiveDay} per active day</Pill>
            <Pill tone="amber">{t.inProgress} in progress</Pill>
            <Pill>updated {relativeTime(data.generatedAt)}</Pill>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          <InsightStat
            label="Interview rate"
            value={fmtPct(r.interviewed, r.submitted || 1)}
            hint={`${r.interviewed} of ${r.submitted} submitted`}
          />
          <InsightStat
            label="Offer rate"
            value={fmtPct(r.offered, r.submitted || 1)}
            hint={`${r.offered} offers`}
          />
          <InsightStat
            label="Rejection rate"
            value={fmtPct(r.rejected, r.submitted || 1)}
            hint={`${r.rejected} rejected`}
          />
        </div>

        <p className="relative mt-4 text-sm text-white/70">
          <span className="eyebrow mr-2 !normal-case !tracking-normal text-accent">Insight</span>
          {slice.insight}
        </p>

        {filter && (
          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/45">Filtered by</span>
            <Pill tone="accent" active>
              {DIM_LABEL[filter.dim] ?? filter.dim}:{' '}
              {filter.dim === 'source' ? channelLabel(filter.value) : filter.value}
            </Pill>
            <Pill onClick={() => setFilter(null)}>Clear filter</Pill>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Current streak" value={`${t.streak}d`} hint={`best ${t.bestStreak} days`} accent delay={50} />
        <Stat label="Best day" value={t.bestDay.count} hint={longDate(t.bestDay.date)} delay={100} />
        <Stat label="Active days" value={`${t.activeDays}/${sinceDays}`} hint="days with at least one apply" delay={150} />
        <Stat label="In progress" value={t.inProgress} hint={`${t.blocked} blocked, ${t.incomplete} incomplete`} delay={200} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Per week" subtitle="Submitted applications, Monday-based weeks" className="lg:col-span-3" delay={250}>
          <WeeklyBars perWeek={slice.perWeek} />
        </Card>
        <Card title="Daily rhythm" subtitle={`${shortDate(data.firstDate)} to today`} className="lg:col-span-2" delay={300}>
          <DailyArea perDay={slice.perDay} />
        </Card>
      </div>

      <Card title="Activity" subtitle="Click a day to open Detail for that date" delay={350}>
        <Heatmap
          perDay={slice.perDay}
          onDayClick={(day) => {
            if (!day?.date) return
            navigate(`/private?date=${day.date}`)
          }}
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="By role family" subtitle="Click a bar to filter the dashboard" delay={400}>
          <Breakdown
            items={slice.byRoleFamily}
            colors={PALETTE}
            dim="family"
            activeLabel={filter?.dim === 'family' ? filter.value : null}
            onSelect={toggleFilter}
          />
        </Card>
        <Card title="By region" subtitle="Where the role sits" delay={450}>
          <Breakdown
            items={slice.byRegion}
            colors={PALETTE}
            dim="region"
            activeLabel={filter?.dim === 'region' ? filter.value : null}
            onSelect={toggleFilter}
          />
        </Card>
        <Card title="By channel" subtitle="LinkedIn vs Jobs board bot vs Other / direct" delay={500}>
          <Breakdown
            items={slice.bySource}
            colors={PALETTE}
            dim="source"
            activeLabel={filter?.dim === 'source' ? filter.value : null}
            onSelect={toggleFilter}
          />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Outcome flow" subtitle="Where applications land after submit" delay={550}>
          <OutcomeFlow
            stages={slice.outcomeFlow}
            activeStage={filter?.dim === 'outcome' ? filter.value : null}
            onSelect={toggleFilter}
          />
        </Card>
        <Card title="Channel → outcome" subtitle="What's hitting by source" delay={600}>
          <SourceOutcomeMatrix links={slice.links} total={r.submitted} />
          {!filter && slice.status?.length > 0 && (
            <div className="mt-5 border-t border-white/8 pt-4">
              <p className="mb-3 text-xs font-semibold text-white/70">Attempt status</p>
              <Breakdown items={slice.status} colors={['#34d399', '#fb7185', '#fbbf24']} />
              <p className="mt-4 text-xs text-white/40">
                Blocked means the application form broke. Incomplete means it stopped before submit. Both are queued for a
                retry.
              </p>
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
          Detail
        </Link>{' '}
        unlocks encrypted company and role rows in your browser.
      </p>
    </div>
  )
}

function InsightStat({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/8 transition hover:ring-accent/25">
      <p className="eyebrow">{label}</p>
      <p className="num mt-1 text-2xl font-bold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-white/40">{hint}</p>
    </div>
  )
}

function spotMove(e) {
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--spot-x', `${((e.clientX - rect.left) / rect.width) * 100}%`)
  el.style.setProperty('--spot-y', `${((e.clientY - rect.top) / rect.height) * 100}%`)
}

function Empty({ title, body }) {
  return (
    <div className="glass rise mx-auto max-w-md p-8 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-white/50">{body}</p>
    </div>
  )
}
