#!/usr/bin/env node
// Pulls the Apply log from Notion and writes two artifacts for the site:
//   public/data/public.json  - aggregate counts only, safe to publish
//   public/data/private.enc  - row-level detail, AES-256-GCM encrypted with PRIVATE_PASSPHRASE
//
// Usage:
//   node scripts/sync.mjs            # requires NOTION_TOKEN, NOTION_DATA_SOURCE_ID, PRIVATE_PASSPHRASE
//   node scripts/sync.mjs --sample   # uses scripts/sample-rows.json, passphrase defaults to "demo"

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { webcrypto } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { roleFamily, region } from './classify.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(here, '../public/data')
const SAMPLE = process.argv.includes('--sample')
const TZ = 'America/New_York'

const NOTION_VERSION = '2025-09-03'
const PAGE_SIZE = 100

// Never exported: "Fields / answers" (demographics, salary, standing answers).
const PRIVATE_FIELDS = ['date', 'company', 'role', 'location', 'source', 'appliedBy', 'url', 'result', 'outcome']

async function fetchNotionRows() {
  const token = process.env.NOTION_TOKEN
  const dsId = process.env.NOTION_DATA_SOURCE_ID
  if (!token || !dsId) {
    throw new Error('NOTION_TOKEN and NOTION_DATA_SOURCE_ID are required (or pass --sample)')
  }
  const rows = []
  let cursor
  do {
    const res = await fetch(`https://api.notion.com/v1/data_sources/${dsId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: PAGE_SIZE, start_cursor: cursor }),
    })
    if (!res.ok) throw new Error(`Notion ${res.status}: ${await res.text()}`)
    const json = await res.json()
    rows.push(...json.results.map(normalize))
    cursor = json.has_more ? json.next_cursor : undefined
  } while (cursor)
  return rows
}

const text = (p) => (p?.rich_text ?? p?.title ?? []).map((t) => t.plain_text).join('').trim()
const select = (p) => p?.select?.name ?? ''

function normalize(page) {
  const p = page.properties
  return {
    date: p.Date?.date?.start?.slice(0, 10) ?? '',
    company: text(p.Company),
    role: text(p.Role),
    location: text(p.Location),
    source: select(p.Source),
    appliedBy: select(p['Applied by']),
    url: sanitizeUrl(p.URL?.url ?? ''),
    result: select(p.Result) || 'Submitted',
    outcome: select(p.Outcome) || 'Applied',
  }
}

// Keep only canonical posting links. ATS confirmation pages often embed
// applicant tokens in the query string, so strip queries and drop anything
// that looks like a confirmation/thank-you page.
function sanitizeUrl(u) {
  if (!u) return ''
  try {
    const url = new URL(u)
    if (/thank|confirm|applied|success|token=|candidate/i.test(url.href)) return ''
    url.search = ''
    url.hash = ''
    return url.href
  } catch {
    return ''
  }
}

async function loadSampleRows() {
  const raw = await readFile(path.join(here, 'sample-rows.json'), 'utf8')
  return JSON.parse(raw).map((r) => ({ ...r, url: sanitizeUrl(r.url ?? '') }))
}

// ---------- aggregates ----------

const fmtDay = (d) => d // rows already carry YYYY-MM-DD
const todayET = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function weekStart(iso) {
  // Monday-based week
  const d = new Date(`${iso}T00:00:00Z`)
  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day)
  return d.toISOString().slice(0, 10)
}

function countBy(rows, key) {
  const m = new Map()
  for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }))
}

function buildPublic(rows) {
  const today = todayET()
  const dated = rows.filter((r) => r.date)
  const submitted = dated.filter((r) => r.result === 'Submitted')
  const inProgress = dated.filter((r) => r.result === 'Blocked' || r.result === 'Incomplete')

  const enriched = submitted.map((r) => ({
    ...r,
    family: roleFamily(r.role),
    region: region(r.location),
  }))

  const thisMonth = today.slice(0, 7)
  const perDayMap = new Map()
  for (const r of submitted) perDayMap.set(r.date, (perDayMap.get(r.date) ?? 0) + 1)

  const firstDate = submitted.map((r) => r.date).sort()[0] ?? today
  const lastDate = submitted.map((r) => r.date).sort().at(-1) ?? today

  // Dense per-day series from first apply to today so the heatmap has no gaps.
  const perDay = []
  for (let d = firstDate; d <= today; d = addDays(d, 1)) perDay.push({ date: d, count: perDayMap.get(d) ?? 0 })

  const perWeekMap = new Map()
  for (const { date, count } of perDay) {
    const w = weekStart(date)
    perWeekMap.set(w, (perWeekMap.get(w) ?? 0) + count)
  }
  const perWeek = [...perWeekMap.entries()].map(([weekOf, count]) => ({ weekOf, count }))

  const perMonthMap = new Map()
  for (const r of submitted) {
    const m = r.date.slice(0, 7)
    perMonthMap.set(m, (perMonthMap.get(m) ?? 0) + 1)
  }
  const perMonth = [...perMonthMap.entries()].sort().map(([month, count]) => ({ month, count }))

  // Streak: consecutive days with >= 1 submission, counting back from today
  // (or yesterday, so an in-progress day doesn't break it).
  let streak = 0
  let cursor = perDayMap.has(today) ? today : addDays(today, -1)
  while (perDayMap.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  let bestStreak = 0
  let run = 0
  for (const { count } of perDay) {
    run = count > 0 ? run + 1 : 0
    bestStreak = Math.max(bestStreak, run)
  }

  const activeDays = perDay.filter((d) => d.count > 0).length
  const daysElapsed = perDay.length
  const bestDay = perDay.reduce((a, b) => (b.count > a.count ? b : a), { date: firstDate, count: 0 })

  const funnelCount = (o) => submitted.filter((r) => r.outcome === o).length
  const appliedOnly = funnelCount('Applied')
  const interviewed = funnelCount('Interview')
  const offered = funnelCount('Offer')
  const rejected = funnelCount('Rejected')
  const n = submitted.length || 1

  // Classic conversion funnel (Interview includes Offer).
  const funnel = [
    { stage: 'Applied', count: submitted.length },
    { stage: 'Interview', count: interviewed + offered },
    { stage: 'Offer', count: offered },
  ]

  // Outcome split for the interactive flow visualizer.
  const outcomeFlow = [
    { stage: 'Submitted', count: submitted.length },
    { stage: 'Applied', count: appliedOnly },
    { stage: 'Rejected', count: rejected },
    { stage: 'Interview', count: interviewed },
    { stage: 'Offer', count: offered },
  ]

  // Safe cross-tabs (no company / role / URL).
  const bySourceOutcome = crossTab(enriched, 'source', 'outcome')
  const byRoleOutcome = crossTab(enriched, 'family', 'outcome')
  const byRegionOutcome = crossTab(enriched, 'region', 'outcome')

  // Anonymized fact rows so the public UI can cross-filter without private fields.
  const facts = enriched.map((r) => ({
    date: r.date,
    source: r.source || 'Other',
    family: r.family,
    region: r.region,
    outcome: r.outcome || 'Applied',
  }))

  const rate = (count) => +(count / n).toFixed(3)

  return {
    generatedAt: new Date().toISOString(),
    timezone: TZ,
    firstDate,
    lastDate,
    totals: {
      submitted: submitted.length,
      thisMonth: submitted.filter((r) => r.date.startsWith(thisMonth)).length,
      thisMonthLabel: thisMonth,
      inProgress: inProgress.length,
      blocked: inProgress.filter((r) => r.result === 'Blocked').length,
      incomplete: inProgress.filter((r) => r.result === 'Incomplete').length,
      rejected,
      interviewed,
      offered,
      applied: appliedOnly,
      interviewRate: rate(interviewed + offered),
      offerRate: rate(offered),
      rejectionRate: rate(rejected),
      streak,
      bestStreak,
      activeDays,
      daysElapsed,
      perActiveDay: activeDays ? +(submitted.length / activeDays).toFixed(1) : 0,
      bestDay,
    },
    perDay,
    perWeek,
    perMonth,
    bySource: countBy(enriched, 'source'),
    byRoleFamily: countBy(enriched, 'family'),
    byRegion: countBy(enriched, 'region'),
    byStatus: countBy(dated, 'result'),
    funnel,
    outcomeFlow,
    bySourceOutcome,
    byRoleOutcome,
    byRegionOutcome,
    facts,
  }
}

/** Count pairs of (dimA, dimB) for Sankey / filtered conversion tables. */
function crossTab(rows, keyA, keyB) {
  const m = new Map()
  for (const r of rows) {
    const a = r[keyA] || 'Other'
    const b = r[keyB] || 'Other'
    const k = `${a}\0${b}`
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()]
    .map(([k, count]) => {
      const [a, b] = k.split('\0')
      return { [keyA]: a, [keyB]: b, count }
    })
    .sort((x, y) => y.count - x.count)
}

// ---------- encryption ----------

const subtle = webcrypto.subtle
const b64 = (buf) => Buffer.from(buf).toString('base64')

async function encrypt(plaintext, passphrase) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16))
  const iv = webcrypto.getRandomValues(new Uint8Array(12))
  const keyMaterial = await subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  const key = await subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  return { v: 1, kdf: 'PBKDF2-SHA256', iterations: 250_000, salt: b64(salt), iv: b64(iv), ct: b64(ct) }
}

function buildPrivate(rows) {
  return rows
    .filter((r) => r.date)
    .map((r) => {
      const out = {}
      for (const k of PRIVATE_FIELDS) out[k] = r[k] ?? ''
      out.family = roleFamily(r.role)
      out.region = region(r.location)
      return out
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

// ---------- main ----------

async function main() {
  const rows = SAMPLE ? await loadSampleRows() : await fetchNotionRows()
  const passphrase = process.env.PRIVATE_PASSPHRASE || (SAMPLE ? 'demo' : '')
  if (!passphrase) throw new Error('PRIVATE_PASSPHRASE is required')

  const pub = buildPublic(rows)
  const priv = await encrypt(JSON.stringify({ generatedAt: pub.generatedAt, rows: buildPrivate(rows) }), passphrase)

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(path.join(OUT_DIR, 'public.json'), JSON.stringify(pub, null, 2))
  await writeFile(path.join(OUT_DIR, 'private.enc'), JSON.stringify(priv))

  console.log(
    `sync ok: ${rows.length} rows (${pub.totals.submitted} submitted, ${pub.totals.inProgress} in progress)` +
      ` -> public.json + private.enc${SAMPLE ? ' [sample data, passphrase "' + passphrase + '"]' : ''}`,
  )
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
