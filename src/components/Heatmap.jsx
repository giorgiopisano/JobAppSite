import { useMemo, useState } from 'react'
import { longDate, weekdayIndex, addDays } from '../lib/format.js'

const DAYS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']
const MIN_WEEKS = 13

// GitHub-style contribution grid: columns are weeks, rows are weekdays.
export default function Heatmap({ perDay, onDayClick }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...perDay.map((d) => d.count))

  const weeks = useMemo(() => {
    if (!perDay.length) return []
    const lead = Math.max(0, MIN_WEEKS * 7 - perDay.length)
    const padded = []
    for (let i = lead; i > 0; i--) padded.push({ date: addDays(perDay[0].date, -i), before: true, count: 0 })
    padded.push(...perDay)

    const cols = []
    let col = new Array(7).fill(null)
    const firstIdx = weekdayIndex(padded[0].date)
    for (let i = 0; i < firstIdx; i++) col[i] = { pad: true }
    for (const day of padded) {
      const idx = weekdayIndex(day.date)
      col[idx] = day
      if (idx === 6) {
        cols.push(col)
        col = new Array(7).fill(null)
      }
    }
    if (col.some(Boolean)) cols.push(col)
    return cols
  }, [perDay])

  const level = (count, before) => {
    if (before) return 'bg-white/[0.025]'
    if (!count) return 'bg-white/6'
    const r = count / max
    if (r > 0.75) return 'bg-accent shadow-[0_0_10px_rgba(34,211,238,0.55)]'
    if (r > 0.5) return 'bg-accent/75'
    if (r > 0.25) return 'bg-accent/50'
    return 'bg-accent/30'
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div className="flex flex-col gap-1 pr-1 pt-0.5 text-[10px] leading-[14px] text-white/35">
          {DAYS.map((d, i) => (
            <span key={i} className="h-[14px]">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((cell, ri) =>
              !cell || cell.pad ? (
                <span key={ri} className="h-[14px] w-[14px]" />
              ) : cell.before ? (
                <span key={ri} className={`h-[14px] w-[14px] rounded-[3px] ${level(0, true)}`} />
              ) : (
                <button
                  key={ri}
                  type="button"
                  aria-label={`${cell.count} on ${longDate(cell.date)}`}
                  onMouseEnter={() => setHover(cell)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(cell)}
                  onBlur={() => setHover(null)}
                  onClick={() => onDayClick?.(cell)}
                  className={`h-[14px] w-[14px] rounded-[3px] transition-transform hover:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${level(cell.count)} ${
                    onDayClick ? 'cursor-pointer' : ''
                  }`}
                />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-white/45">
        <span className="num">
          {hover
            ? `${hover.count} on ${longDate(hover.date)}${onDayClick ? ' · click for Detail' : ''}`
            : onDayClick
              ? 'Hover a day · click to open Detail'
              : 'Hover a day'}
        </span>
        <span className="flex items-center gap-1">
          less
          {['bg-white/6', 'bg-accent/30', 'bg-accent/50', 'bg-accent/75', 'bg-accent'].map((c) => (
            <span key={c} className={`h-[10px] w-[10px] rounded-[2px] ${c}`} />
          ))}
          more
        </span>
      </div>
    </div>
  )
}
