const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// All dates are YYYY-MM-DD strings already in ET; parse as UTC to avoid
// browser timezone drift when formatting.
export function parseDay(iso) {
  return new Date(`${iso}T00:00:00Z`)
}

export function shortDate(iso) {
  const d = parseDay(iso)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export function longDate(iso) {
  const d = parseDay(iso)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

export function addDays(iso, n) {
  const d = parseDay(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function weekdayIndex(iso) {
  // Monday = 0
  return (parseDay(iso).getUTCDay() + 6) % 7
}

export function relativeTime(isoTs) {
  const diff = Date.now() - new Date(isoTs).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} d ago`
}

export const dataUrl = (file) => `${import.meta.env.BASE_URL}data/${file}`
