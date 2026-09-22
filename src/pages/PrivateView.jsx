import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Pill } from '../components/Card.jsx'
import { decryptPayload } from '../lib/crypto.js'
import { dataUrl, longDate, relativeTime } from '../lib/format.js'
import { fmtPct } from '../lib/insights.js'

const SESSION_KEY = 'jobhunt.passphrase'

const RESULT_TONE = { Submitted: 'green', Blocked: 'red', Incomplete: 'amber', Skipped: 'neutral' }
const OUTCOME_TONE = { Applied: 'neutral', Rejected: 'red', Interview: 'amber', Offer: 'green' }
const AGENT_TONE = { Grok: 'blue', Muse: 'violet' }

export default function PrivateView() {
  const [envelope, setEnvelope] = useState(null)
  const [payload, setPayload] = useState(null)
  const [pass, setPass] = useState(() => sessionStorage.getItem(SESSION_KEY) ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(dataUrl('private.enc'), { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setEnvelope)
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (envelope && pass && !payload && !busy) unlock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelope])

  async function unlock(e) {
    e?.preventDefault()
    if (!envelope || !pass) return
    setBusy(true)
    setError(null)
    try {
      const data = await decryptPayload(envelope, pass)
      setPayload(data)
      sessionStorage.setItem(SESSION_KEY, pass)
    } catch {
      setError('Wrong passphrase.')
      sessionStorage.removeItem(SESSION_KEY)
    } finally {
      setBusy(false)
    }
  }

  function lock() {
    sessionStorage.removeItem(SESSION_KEY)
    setPayload(null)
    setPass('')
  }

  if (!payload) {
    return (
      <div className="mx-auto max-w-md">
        <Card
          title="Private detail view"
          subtitle="Companies, roles and links. Decrypted in your browser; nothing is sent anywhere."
        >
          <form onSubmit={unlock} className="space-y-3">
            <label className="block text-xs text-white/45" htmlFor="passphrase">
              Passphrase
            </label>
            <input
              id="passphrase"
              type="password"
              autoFocus
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Passphrase"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none ring-accent/40 placeholder:text-white/30 focus:ring-2"
            />
            <button
              type="submit"
              disabled={!envelope || !pass || busy}
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-40"
            >
              {busy ? 'Decrypting' : envelope ? 'Unlock' : 'Loading'}
            </button>
            {error && <p className="text-xs text-rose-300">{error}</p>}
          </form>
        </Card>
      </div>
    )
  }

  return <Table rows={payload.rows} generatedAt={payload.generatedAt} onLock={lock} />
}

function Table({ rows, generatedAt, onLock }) {
  const [params, setParams] = useSearchParams()
  const dateParam = params.get('date') || ''

  const [q, setQ] = useState('')
  const [result, setResult] = useState('All')
  const [outcome, setOutcome] = useState('All')
  const [source, setSource] = useState('All')
  const [agent, setAgent] = useState('All')
  const [sort, setSort] = useState('date-desc')
  const [dateFilter, setDateFilter] = useState(dateParam)

  useEffect(() => {
    setDateFilter(dateParam)
  }, [dateParam])

  const options = (key) => ['All', ...Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))).sort()]

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = rows.filter(
      (r) =>
        (result === 'All' || r.result === result) &&
        (outcome === 'All' || r.outcome === outcome) &&
        (source === 'All' || r.source === source) &&
        (agent === 'All' || r.appliedBy === agent) &&
        (!dateFilter || r.date === dateFilter) &&
        (!needle || `${r.company} ${r.role} ${r.location} ${r.family}`.toLowerCase().includes(needle)),
    )

    const cmp = {
      'date-desc': (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.company.localeCompare(b.company)),
      'date-asc': (a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : a.company.localeCompare(b.company)),
      company: (a, b) => a.company.localeCompare(b.company) || (a.date < b.date ? 1 : -1),
      outcome: (a, b) => (a.outcome || '').localeCompare(b.outcome || '') || (a.date < b.date ? 1 : -1),
    }
    return list.sort(cmp[sort] ?? cmp['date-desc'])
  }, [rows, q, result, outcome, source, agent, dateFilter, sort])

  const submitted = filtered.filter((r) => r.result === 'Submitted')
  const interviewed = submitted.filter((r) => r.outcome === 'Interview' || r.outcome === 'Offer').length
  const offered = submitted.filter((r) => r.outcome === 'Offer').length
  const rejected = submitted.filter((r) => r.outcome === 'Rejected').length

  const grouped = useMemo(() => {
    const m = new Map()
    for (const r of filtered) {
      if (!m.has(r.date)) m.set(r.date, [])
      m.get(r.date).push(r)
    }
    return [...m.entries()]
  }, [filtered])

  function clearDate() {
    setDateFilter('')
    const next = new URLSearchParams(params)
    next.delete('date')
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-4">
      <div className="glass glass-hover rise flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search company, role, location"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm outline-none ring-accent/40 placeholder:text-white/30 focus:ring-2"
          />
          <Select value={result} onChange={setResult} options={options('result')} label="Status" />
          <Select value={outcome} onChange={setOutcome} options={options('outcome')} label="Outcome" />
          <Select value={source} onChange={setSource} options={options('source')} label="Channel" />
          <Select value={agent} onChange={setAgent} options={options('appliedBy')} label="Agent" />
          <Select
            value={sort}
            onChange={setSort}
            options={[
              { value: 'date-desc', label: 'Newest' },
              { value: 'date-asc', label: 'Oldest' },
              { value: 'company', label: 'Company' },
              { value: 'outcome', label: 'Outcome' },
            ]}
            label="Sort"
            objectOptions
          />
          <button
            onClick={onLock}
            className="rounded-xl px-3 py-2 text-xs text-white/55 hover:bg-white/5 hover:text-white"
          >
            Lock
          </button>
        </div>

        {dateFilter && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/45">Date</span>
            <Pill tone="accent" active>
              {longDate(dateFilter)}
            </Pill>
            <Pill onClick={clearDate}>Clear date</Pill>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-white/45">
          <span className="num text-white/80">{filtered.length}</span> of {rows.length} attempts. Snapshot{' '}
          {relativeTime(generatedAt)}.
        </p>
        <p className="text-xs text-white/45">
          In view:{' '}
          <span className="num text-emerald-300/90">{fmtPct(interviewed, submitted.length || 1)}</span> interview ·{' '}
          <span className="num text-accent">{fmtPct(offered, submitted.length || 1)}</span> offer ·{' '}
          <span className="num text-rose-300/80">{fmtPct(rejected, submitted.length || 1)}</span> rejected
          {submitted.length ? (
            <span className="text-white/30"> ({submitted.length} submitted)</span>
          ) : null}
        </p>
      </div>

      {grouped.map(([date, items], gi) => (
        <section key={date} className="rise" style={{ animationDelay: `${Math.min(gi, 8) * 40}ms` }}>
          <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-white/60">
            {longDate(date)}
            <span className="num rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/55">{items.length}</span>
          </h3>
          <ul className="glass glass-hover divide-y divide-white/6 overflow-hidden">
            {items.map((r, i) => (
              <li
                key={`${r.company}-${r.role}-${i}`}
                className="flex flex-col gap-2 px-4 py-3 transition hover:bg-white/[0.03] sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white/90">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer noopener" className="hover:text-accent">
                        {r.company} <span className="text-white/30">&#8599;</span>
                      </a>
                    ) : (
                      r.company
                    )}
                  </p>
                  <p className="truncate text-xs text-white/55">
                    {r.role}
                    {r.location && <span className="text-white/35"> &middot; {r.location}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone={RESULT_TONE[r.result] ?? 'neutral'}>{r.result}</Pill>
                  {r.result === 'Submitted' && r.outcome && (
                    <Pill tone={OUTCOME_TONE[r.outcome] ?? 'neutral'}>{r.outcome}</Pill>
                  )}
                  <Pill>{r.source}</Pill>
                  {r.appliedBy && <Pill tone={AGENT_TONE[r.appliedBy] ?? 'neutral'}>{r.appliedBy}</Pill>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!grouped.length && <p className="px-1 text-sm text-white/50">Nothing matches those filters.</p>}
    </div>
  )
}

function Select({ value, onChange, options, label, objectOptions = false }) {
  return (
    <label className="flex items-center gap-2 text-xs text-white/45">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-accent/40"
      >
        {options.map((o) => {
          const v = objectOptions ? o.value : o
          const text = objectOptions ? o.label : o
          return (
            <option key={v} value={v} className="bg-ink">
              {text}
            </option>
          )
        })}
      </select>
    </label>
  )
}
