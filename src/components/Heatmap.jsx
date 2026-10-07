import { useMemo, useState } from 'react'
import { longDate, weekdayIndex } from '../lib/format.js'

const DAYS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']
const SCALE = ['bg-hair', 'bg-[#c7c7cc]', 'bg-[#8e8e93]', 'bg-[#48484a]', 'bg-ink']

// Contribution grid starting at the first active week: columns are weeks, rows are weekdays.
export default function Heatmap({ perDay, onDayClick }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...perDay.map((d) => d.count))

  const weeks = useMemo(() => {
    if (!perDay.length) return []
    const cols = []
    let col = new Array(7).fill(null)
    for (const day of perDay) {
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

  const level = (count) => {
    if (!count) return SCALE[0]
    const r = count / max
    if (r > 0.75) return SCALE[4]
    if (r > 0.5) return SCALE[3]
    if (r > 0.25) return SCALE[2]
    return SCALE[1]
  }

  return (
    <div>
      <div className="flex gap-[5px] overflow-x-auto pb-1">
        <div className="flex flex-col gap-[5px] pr-1.5 text-[10px] leading-4 text-faint">
          {DAYS.map((d, i) => (
            <span key={i} className="h-4">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[5px]">
            {col.map((cell, ri) =>
              !cell ? (
                <span key={ri} className="h-4 w-4" />
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
                  className={`h-4 w-4 rounded-[4px] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-ink ${level(cell.count)} ${
                    onDayClick ? 'cursor-pointer' : ''
                  }`}
                />
              ),
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 text-xs text-muted">
        <span className="num">
          {hover ? `${hover.count} on ${longDate(hover.date)}` : onDayClick ? 'Click a day to open its applications' : ''}
        </span>
        <span className="flex items-center gap-1">
          Less
          {SCALE.map((c) => (
            <span key={c} className={`h-2.5 w-2.5 rounded-[3px] ${c}`} />
          ))}
          More
        </span>
      </div>
    </div>
  )
}
