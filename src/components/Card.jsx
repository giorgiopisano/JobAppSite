export function Card({ title, subtitle, action, className = '', children, delay = 0 }) {
  return (
    <section className={`glass rise p-5 sm:p-6 ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-white/85">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-white/45">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, hint, accent = false, delay = 0 }) {
  return (
    <div className="glass rise p-5" style={{ animationDelay: `${delay}ms` }}>
      <p className="eyebrow">{label}</p>
      <p className={`num mt-2 text-3xl font-bold sm:text-4xl ${accent ? 'text-accent glow' : 'text-white'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-white/45">{hint}</p>}
    </div>
  )
}

export function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-white/8 text-white/70 ring-white/10',
    accent: 'bg-accent-soft text-accent ring-accent/30',
    green: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25',
    amber: 'bg-amber-400/10 text-amber-300 ring-amber-400/25',
    red: 'bg-rose-400/10 text-rose-300 ring-rose-400/25',
    violet: 'bg-violet-400/10 text-violet-300 ring-violet-400/25',
    blue: 'bg-sky-400/10 text-sky-300 ring-sky-400/25',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tones[tone]}`}>
      {children}
    </span>
  )
}
