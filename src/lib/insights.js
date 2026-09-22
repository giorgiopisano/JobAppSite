// Client-side helpers for public aggregates / anonymized facts.

/** Display labels for Apply log Source values (dashboard "By channel"). */
export const CHANNEL_LABELS = {
  LinkedIn: 'LinkedIn',
  'Company careers': 'Company careers',
  Greenhouse: 'Greenhouse',
  Workday: 'Workday',
  'Other ATS': 'Other ATS',
  'Job board': 'Job board',
  Other: 'Other',
  // Legacy values still present in older Apply log rows (sync also remaps these)
  Jobs: 'Company careers (legacy)',
  Muse: 'Other (legacy)',
  '': '(no source)',
}

export function channelLabel(source) {
  if (source == null || source === '') return CHANNEL_LABELS['']
  return CHANNEL_LABELS[source] ?? source
}

export function pct(n, d) {
  if (!d) return 0
  return Math.round((n / d) * 1000) / 10
}

export function fmtPct(n, d) {
  return `${pct(n, d)}%`
}

/** Filter anonymized facts by an active cross-filter. */
export function filterFacts(facts, filter) {
  if (!filter) return facts
  const { dim, value } = filter
  return facts.filter((f) => f[dim] === value)
}

export function countBy(facts, key) {
  const m = new Map()
  for (const f of facts) m.set(f[key], (m.get(f[key]) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }))
}

export function outcomeFlowFrom(facts) {
  const submitted = facts.length
  const count = (o) => facts.filter((f) => f.outcome === o).length
  return [
    { stage: 'Submitted', count: submitted },
    { stage: 'Applied', count: count('Applied') },
    { stage: 'Rejected', count: count('Rejected') },
    { stage: 'Interview', count: count('Interview') },
    { stage: 'Offer', count: count('Offer') },
  ]
}

export function classicFunnelFrom(facts) {
  const submitted = facts.length
  const interviewed = facts.filter((f) => f.outcome === 'Interview' || f.outcome === 'Offer').length
  const offered = facts.filter((f) => f.outcome === 'Offer').length
  return [
    { stage: 'Submitted', count: submitted },
    { stage: 'Interview', count: interviewed },
    { stage: 'Offer', count: offered },
  ]
}

export function perDayFrom(facts, firstDate, today) {
  const map = new Map()
  for (const f of facts) map.set(f.date, (map.get(f.date) ?? 0) + 1)
  if (!firstDate || !today) {
    return [...map.entries()].sort().map(([date, count]) => ({ date, count }))
  }
  const out = []
  for (let d = firstDate; d <= today; ) {
    out.push({ date: d, count: map.get(d) ?? 0 })
    const next = new Date(`${d}T00:00:00Z`)
    next.setUTCDate(next.getUTCDate() + 1)
    d = next.toISOString().slice(0, 10)
  }
  return out
}

export function perWeekFrom(perDay) {
  const map = new Map()
  for (const { date, count } of perDay) {
    const d = new Date(`${date}T00:00:00Z`)
    const day = (d.getUTCDay() + 6) % 7
    d.setUTCDate(d.getUTCDate() - day)
    const w = d.toISOString().slice(0, 10)
    map.set(w, (map.get(w) ?? 0) + count)
  }
  return [...map.entries()].map(([weekOf, count]) => ({ weekOf, count }))
}

export function ratesFrom(facts) {
  const n = facts.length || 1
  const interviewed = facts.filter((f) => f.outcome === 'Interview' || f.outcome === 'Offer').length
  const offered = facts.filter((f) => f.outcome === 'Offer').length
  const rejected = facts.filter((f) => f.outcome === 'Rejected').length
  return {
    submitted: facts.length,
    interviewed,
    offered,
    rejected,
    interviewRate: interviewed / n,
    offerRate: offered / n,
    rejectionRate: rejected / n,
  }
}

/** Best channel / role family by interview conversion (min volume gate). */
function bestByInterview(facts, dim, min = 3) {
  const groups = new Map()
  for (const f of facts) {
    const k = f[dim] || 'Other'
    if (!groups.has(k)) groups.set(k, { label: k, total: 0, hits: 0 })
    const g = groups.get(k)
    g.total++
    if (f.outcome === 'Interview' || f.outcome === 'Offer') g.hits++
  }
  let best = null
  for (const g of groups.values()) {
    if (g.total < min) continue
    const rate = g.hits / g.total
    if (!best || rate > best.rate || (rate === best.rate && g.total > best.total)) {
      best = { ...g, rate }
    }
  }
  return best
}

export function buildInsightLine(facts, bySource) {
  const top = bySource?.[0]
  const topChannel = top ? channelLabel(top.label) : null
  const volumeBit = topChannel ? `Most volume via ${topChannel}` : null
  const bestFamily = bestByInterview(facts, 'family', 2)
  const bestSource = bestByInterview(facts, 'source', 3)

  const hitBit = bestFamily
    ? bestFamily.hits > 0
      ? `interviews concentrated in ${bestFamily.label} (${fmtPct(bestFamily.hits, bestFamily.total)})`
      : `no interviews yet across role families with ${bestFamily.total}+ apps`
    : bestSource?.hits > 0
      ? `${channelLabel(bestSource.label)} leads interview rate (${fmtPct(bestSource.hits, bestSource.total)})`
      : null

  if (volumeBit && hitBit) return `${volumeBit}; ${hitBit}.`
  if (volumeBit) return `${volumeBit}.`
  if (hitBit) return `${hitBit[0].toUpperCase()}${hitBit.slice(1)}.`
  return 'Add Outcome tags on Apply log rows to unlock conversion insights.'
}

/** Source → Outcome links for a simple Sankey-style flow. */
export function sourceOutcomeLinks(facts) {
  const m = new Map()
  for (const f of facts) {
    const k = `${f.source}\0${f.outcome}`
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].map(([k, count]) => {
    const [source, outcome] = k.split('\0')
    return { source, outcome, count }
  })
}
