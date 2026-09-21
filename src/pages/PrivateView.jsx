import { useEffect, useMemo, useState } from 'react'
import { Card, Pill } from '../components/Card.jsx'
import { decryptPayload } from '../lib/crypto.js'
import { dataUrl, longDate, relativeTime } from '../lib/format.js'

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

  // Auto-unlock when a passphrase is remembered for this tab.
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
        <Card title="Private detail view" subtitle="Companies, roles and links. Decrypted in your browser; nothing is sent anywhere.">
          <form onSubmit={unlock} className="space-y-3">
            <input
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
  const [q, setQ] = useState('')
  const [result, setResult] = useState('All')
  const [source, setSource] = useState('All')
  const [agent, setAgent] = useState('All')

  const options = (key) => ['All', ...Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))).sort()]

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (result === 'All' || r.result === result) &&
        (source === 'All' || r.source === source) &&
        (agent === 'All' || r.appliedBy === agent) &&
        (!needle || `${r.company} ${r.role} ${r.location} ${r.family}`.toLowerCase().includes(needle)),
    )
  }, [rows, q, result, source, agent])

  const grouped = useMemo(() => {
    const m = new Map()
    for (const r of filtered) {
      if (!m.has(r.date)) m.set(r.date, [])
      m.get(r.date).push(r)
    }
    return [...m.entries()]
  }, [filtered])

  return (
    <div className="space-y-4">
      <div className="glass rise flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company, role, location"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm outline-none ring-accent/40 placeholder:text-white/30 focus:ring-2"
        />
        <Select value={result} onChange={setResult} options={options('result')} label="Status" />
        <Select value={source} onChange={setSource} options={options('source')} label="Channel" />
        <Select value={agent} onChange={setAgent} options={options('appliedBy')} label="Agent" />
        <button onClick={onLock} className="rounded-xl px-3 py-2 text-xs text-white/55 hover:bg-white/5 hover:text-white">
          Lock
        </button>
      </div>

      <p className="px-1 text-xs text-white/45">
        <span className="num text-white/80">{filtered.length}</span> of {rows.length} attempts. Snapshot {relativeTime(generatedAt)}.
      </p>

      {grouped.map(([date, items], gi) => (
        <section key={date} className="rise" style={{ animationDelay: `${Math.min(gi, 8) * 40}ms` }}>
          <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-white/60">
            {longDate(date)}
            <span className="num rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/55">{items.length}</span>
          </h3>
          <ul className="glass divide-y divide-white/6 overflow-hidden">
            {items.map((r, i) => (
              <li key={`${r.company}-${r.role}-${i}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
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
                  {r.result === 'Submitted' && r.outcome && r.outcome !== 'Applied' && (
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

function Select({ value, onChange, options, label }) {
  return (
    <label className="flex items-center gap-2 text-xs text-white/45">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-accent/40"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-ink">
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
