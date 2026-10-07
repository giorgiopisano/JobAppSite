import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pill, Segmented } from '../components/Card.jsx'
import { decryptPayload } from '../lib/crypto.js'
import { dataUrl, longDate, relativeTime } from '../lib/format.js'
import { channelLabel, fmtPct } from '../lib/insights.js'

const SESSION_KEY = 'jobhunt.passphrase'

const RESULT_TONE = { Submitted: 'green', Blocked: 'amber', Incomplete: 'amber', Skipped: 'neutral' }
const OUTCOME_TONE = { Applied: 'green', Rejected: 'red', Interview: 'amber', Offer: 'green' }
const RETRY = new Set(['Blocked', 'Incomplete'])
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'retry', label: 'Needs retry' },
]
const SORTS = [
  { value: 'date-desc', label: 'Newest' },
  { value: 'date-asc', label: 'Oldest' },
  { value: 'company', label: 'Company' },
  { value: 'outcome', label: 'Outcome' },
]

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
      <div className="rise mx-auto max-w-sm pt-6 text-center sm:pt-12">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-tile" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="4" y="9" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </span>
        <h1 className="mt-5 text-[28px] font-semibold tracking-tight">Applications</h1>
        <p className="mt-1 text-[15px] text-muted">Companies, roles, and links decrypt in your browser.</p>
        <form onSubmit={unlock} className="mt-7 space-y-3 text-left">
          <input type="text" name="username" autoComplete="username" value="giorgio" readOnly hidden />
          <label className="sr-only" htmlFor="passphrase">
            Passphrase
          </label>
          <input
            id="passphrase"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Passphrase"
            className="field py-3"
          />
          <button type="submit" disabled={!envelope || !pass || busy} className="btn w-full py-3">
            {busy ? 'Unlocking…' : envelope ? 'Unlock' : 'Loading…'}
          </button>
          {error && <p className="text-center text-[13px] text-bad">{error}</p>}
        </form>
        <p className="mt-5 text-xs text-faint">Saved by your browser's password manager.</p>
      </div>
    )
  }

  return <List rows={payload.rows} generatedAt={payload.generatedAt} onLock={lock} />
}

function List({ rows, generatedAt, onLock }) {
  const [params, setParams] = useSearchParams()
  const dateFilter = params.get('date') || ''
  const status = STATUS_OPTIONS.some((o) => o.value === params.get('status')) ? params.get('status') : 'all'

  const [q, setQ] = useState('')
  const [outcome, setOutcome] = useState('All')
  const [source, setSource] = useState('All')
  const [agent, setAgent] = useState('All')
  const [sort, setSort] = useState('date-desc')

  function setParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const options = (key) => ['All', ...Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))).sort()]

  const retryCount = useMemo(() => rows.filter((r) => RETRY.has(r.result)).length, [rows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = rows.filter(
      (r) =>
        (status === 'all' || (status === 'retry' ? RETRY.has(r.result) : r.result === 'Submitted')) &&
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
  }, [rows, q, status, outcome, source, agent, dateFilter, sort])

  const submitted = filtered.filter((r) => r.result === 'Submitted')
  const interviewed = submitted.filter((r) => r.outcome === 'Interview' || r.outcome === 'Offer').length
  const hasOutcomes = submitted.some((r) => r.outcome && r.outcome !== 'Applied')

  const grouped = useMemo(() => {
    if (sort === 'company' || sort === 'outcome') return [[null, filtered]]
    const m = new Map()
    for (const r of filtered) {
      if (!m.has(r.date)) m.set(r.date, [])
      m.get(r.date).push(r)
    }
    return [...m.entries()]
  }, [filtered, sort])

  const activeFilters = [outcome, source, agent].filter((v) => v !== 'All').length + (sort !== 'date-desc' ? 1 : 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[34px] font-semibold tracking-tight">Applications</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            <span className="num font-medium text-ink">{filtered.length}</span> of {rows.length} attempts
            {hasOutcomes && ` · ${fmtPct(interviewed, submitted.length || 1)} interview rate`} · snapshot{' '}
            {relativeTime(generatedAt)}
          </p>
        </div>
        <button type="button" onClick={onLock} className="btn-quiet">
          Lock
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company, role, location"
          className="field sm:flex-1"
        />
        <div className="flex items-center justify-between gap-2">
          <Segmented
            label="Status"
            value={status}
            onChange={(v) => setParam('status', v === 'all' ? '' : v)}
            options={STATUS_OPTIONS.map((o) => (o.value === 'retry' ? { ...o, label: `Needs retry ${retryCount}` } : o))}
          />
          <FiltersPopover count={activeFilters}>
            <Select label="Outcome" value={outcome} onChange={setOutcome} options={options('outcome')} />
            <Select
              label="Channel"
              value={source}
              onChange={setSource}
              options={options('source').map((v) => ({ value: v, label: v === 'All' ? v : channelLabel(v) }))}
            />
            <Select label="Agent" value={agent} onChange={setAgent} options={options('appliedBy')} />
            <Select label="Sort" value={sort} onChange={setSort} options={SORTS} />
            {activeFilters > 0 && (
              <button
                type="button"
                className="text-[13px] text-muted hover:text-ink"
                onClick={() => {
                  setOutcome('All')
                  setSource('All')
                  setAgent('All')
                  setSort('date-desc')
                }}
              >
                Reset filters
              </button>
            )}
          </FiltersPopover>
        </div>
      </div>

      {dateFilter && (
        <div className="flex items-center gap-2">
          <Pill active>{longDate(dateFilter)}</Pill>
          <Pill tone="ink" onClick={() => setParam('date', '')}>
            Show all dates
          </Pill>
        </div>
      )}

      <div className="space-y-6">
        {grouped.map(([date, items]) => (
          <section key={date ?? 'all'}>
            {date && (
              <h2 className="sticky top-14 z-10 flex items-baseline justify-between bg-page/90 py-2 text-[13px] font-semibold backdrop-blur">
                {longDate(date)}
                <span className="num font-normal text-muted">{items.length}</span>
              </h2>
            )}
            <ul className="tile divide-y divide-hair overflow-hidden">
              {items.map((r, i) => (
                <Row key={`${r.company}-${r.role}-${i}`} r={r} showDate={!date} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {!filtered.length && <p className="py-10 text-center text-[15px] text-muted">Nothing matches those filters.</p>}
    </div>
  )
}

function Row({ r, showDate }) {
  const statusLabel = r.result === 'Submitted' && r.outcome && r.outcome !== 'Applied' ? r.outcome : r.result
  const tone = statusLabel === r.result ? RESULT_TONE[r.result] : OUTCOME_TONE[r.outcome]
  const meta = [channelLabel(r.source), r.appliedBy, showDate && longDate(r.date)].filter(Boolean).join(' · ')
  const Company = r.url ? 'a' : 'span'
  return (
    <li className="flex flex-col gap-1.5 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-6">
      <div className="min-w-0 flex-1">
        <Company
          {...(r.url ? { href: r.url, target: '_blank', rel: 'noreferrer noopener' } : {})}
          className={`inline-flex max-w-full items-center gap-1 truncate text-[15px] font-semibold ${r.url ? 'hover:underline' : ''}`}
        >
          <span className="truncate">{r.company}</span>
          {r.url && (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="shrink-0 text-faint" aria-hidden="true">
              <path d="M4 2h6v6M10 2 3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          )}
        </Company>
        <p className="truncate text-[13px] text-muted">
          {r.role}
          {r.location && ` · ${r.location}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4 text-xs text-faint sm:justify-end">
        <span className="hidden sm:inline">{meta}</span>
        <Pill tone={tone ?? 'neutral'}>{statusLabel}</Pill>
        <span className="sm:hidden">{meta}</span>
      </div>
    </li>
  )
}

function FiltersPopover({ count, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`btn-quiet inline-flex items-center gap-1.5 ${count ? 'bg-ink! text-white!' : ''}`}
      >
        Filters
        {count > 0 && <span className="num text-[11px] opacity-70">{count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 space-y-3 rounded-2xl bg-white p-4 shadow-[0_10px_40px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.04)]">
          {children}
        </div>
      )}
    </div>
  )
}

function Select({ value, onChange, options, label }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field mt-1 py-2">
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value
          const text = typeof o === 'string' ? o : o.label
          return (
            <option key={v} value={v}>
              {text}
            </option>
          )
        })}
      </select>
    </label>
  )
}
