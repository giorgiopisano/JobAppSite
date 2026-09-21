import { useEffect, useState } from 'react'
import { Card, Stat, Pill } from '../components/Card.jsx'
import Heatmap from '../components/Heatmap.jsx'
import { WeeklyBars, DailyArea, Breakdown, Funnel } from '../components/Charts.jsx'
import { dataUrl, longDate, monthLabel, relativeTime, shortDate } from '../lib/format.js'

const PALETTE = ['#22d3ee', '#818cf8', '#34d399', '#fbbf24', '#f472b6', '#94a3b8']

export default function PublicDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(dataUrl('public.json'), { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch(setError)
  }, [])

  if (error) return <Empty title="Couldn't load data" body={String(error.message)} />
  if (!data) return <Empty title="Loading" body="Fetching the latest numbers." />

  const t = data.totals
  const sinceDays = t.daysElapsed
  const status = data.byStatus.filter((s) => s.label !== 'Skipped')

  return (
    <div className="space-y-5">
      <section className="glass rise relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">{monthLabel(t.thisMonthLabel)} so far</p>
            <p className="num glow mt-2 text-7xl font-extrabold leading-none text-accent sm:text-8xl">{t.thisMonth}</p>
            <p className="mt-3 text-sm text-white/60">
              applications submitted this month.{' '}
              <span className="text-white/85">{t.submitted}</span> total since {longDate(data.firstDate)}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Pill tone="accent">{t.streak}-day streak</Pill>
            <Pill tone="green">{t.perActiveDay} per active day</Pill>
            <Pill tone="amber">{t.inProgress} in progress</Pill>
            <Pill>updated {relativeTime(data.generatedAt)}</Pill>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Current streak" value={`${t.streak}d`} hint={`best ${t.bestStreak} days`} accent delay={50} />
        <Stat label="Best day" value={t.bestDay.count} hint={longDate(t.bestDay.date)} delay={100} />
        <Stat label="Active days" value={`${t.activeDays}/${sinceDays}`} hint="days with at least one apply" delay={150} />
        <Stat label="In progress" value={t.inProgress} hint={`${t.blocked} blocked, ${t.incomplete} incomplete`} delay={200} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Per week" subtitle="Submitted applications, Monday-based weeks" className="lg:col-span-3" delay={250}>
          <WeeklyBars perWeek={data.perWeek} />
        </Card>
        <Card title="Daily rhythm" subtitle={`${shortDate(data.firstDate)} to today`} className="lg:col-span-2" delay={300}>
          <DailyArea perDay={data.perDay} />
        </Card>
      </div>

      <Card title="Activity" subtitle="Every day since the hunt started" delay={350}>
        <Heatmap perDay={data.perDay} />
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="By role family" subtitle="Keyword-classified from the job title" delay={400}>
          <Breakdown items={data.byRoleFamily} colors={PALETTE} />
        </Card>
        <Card title="By region" subtitle="Where the role sits" delay={450}>
          <Breakdown items={data.byRegion} colors={PALETTE} />
        </Card>
        <Card title="By channel" subtitle="How the application went in" delay={500}>
          <Breakdown items={data.bySource} colors={PALETTE} />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Funnel" subtitle="Applied, interviewing, offers" delay={550}>
          <Funnel stages={data.funnel} rejected={t.rejected} />
        </Card>
        <Card title="Attempt status" subtitle="Blocked and incomplete attempts get retried" delay={600}>
          <Breakdown items={status} colors={['#34d399', '#fb7185', '#fbbf24']} />
          <p className="mt-4 text-xs text-white/40">
            Blocked means the application form broke (captcha, tunnel error, dead link). Incomplete means it stopped before submit. Both are queued for a retry.
          </p>
        </Card>
      </div>

      {data.perMonth.length > 1 && (
        <Card title="By month" delay={650}>
          <Breakdown items={data.perMonth.map((m) => ({ label: monthLabel(m.month), count: m.count }))} colors={PALETTE} />
        </Card>
      )}
    </div>
  )
}

function Empty({ title, body }) {
  return (
    <div className="glass rise mx-auto max-w-md p-8 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-white/50">{body}</p>
    </div>
  )
}
