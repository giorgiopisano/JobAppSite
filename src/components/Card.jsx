export function Card({ title, subtitle, action, className = '', children, delay = 0 }) {
  return (
    <section
      className={`glass glass-hover rise p-5 sm:p-6 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-white/88">{title}</h2>}
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
    <div className="glass glass-hover rise p-5" style={{ animationDelay: `${delay}ms` }}>
      <p className="eyebrow">{label}</p>
      <p className={`num mt-2 text-3xl font-bold sm:text-4xl ${accent ? 'text-accent glow' : 'text-white'}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-white/45">{hint}</p>}
    </div>
  )
}

/** Career Track style KPI tile with icon + status dots. */
export function Kpi({ label, value, hint, icon, delay = 0, activeDots = 1 }) {
  return (
    <div className="glass glass-hover rise p-4 sm:p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-white/50">{label}</p>
          <p className="num mt-1.5 text-3xl font-bold text-white sm:text-[2rem]">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-white/40">{hint}</p>}
        </div>
        <div className="kpi-icon" aria-hidden="true">
          {icon}
        </div>
      </div>
      <div className="kpi-dots mt-4">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < activeDots ? 'on' : ''} />
        ))}
      </div>
    </div>
  )
}

export function Pill({ children, tone = 'neutral', onClick, active = false }) {
  const tones = {
    neutral: 'bg-white/8 text-white/70 ring-white/10',
    accent: 'bg-accent-soft text-accent ring-accent/30',
    green: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/25',
    amber: 'bg-amber-400/10 text-amber-300 ring-amber-400/25',
    red: 'bg-rose-400/10 text-rose-300 ring-rose-400/25',
    violet: 'bg-violet-400/10 text-violet-300 ring-violet-400/25',
    blue: 'bg-sky-400/10 text-sky-300 ring-sky-400/25',
  }
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 transition ${tones[tone]} ${
        onClick ? 'hover:brightness-125 cursor-pointer' : ''
      } ${active ? 'ring-accent/50 bg-accent/15 text-accent' : ''}`}
    >
      {children}
    </Tag>
  )
}
