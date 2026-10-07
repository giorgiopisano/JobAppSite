export function Card({ title, subtitle, action, className = '', children, delay = 0 }) {
  return (
    <section className={`tile rise p-6 sm:p-7 ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {(title || action) && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, hint, delay = 0, tone, as: Tag = 'div', ...rest }) {
  const toneClass = tone === 'warn' ? 'text-warn' : ''
  return (
    <Tag
      className={`tile rise block p-5 text-left ${Tag === 'div' ? '' : 'transition hover:bg-hair'}`}
      style={{ animationDelay: `${delay}ms` }}
      {...rest}
    >
      <p className="label">{label}</p>
      <p className={`num mt-1.5 text-[28px] font-semibold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </Tag>
  )
}

const DOT = {
  neutral: 'bg-faint',
  green: 'bg-good',
  amber: 'bg-warn',
  red: 'bg-bad',
  ink: 'bg-ink',
}

/** Status label with a small colored dot. */
export function Pill({ children, tone = 'neutral', onClick, active = false }) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full text-xs font-medium transition ${
        active ? 'bg-ink px-2.5 py-1 text-white' : onClick ? 'bg-page px-2.5 py-1 text-ink hover:bg-hair' : 'text-muted'
      }`}
    >
      {!active && <span className={`h-1.5 w-1.5 rounded-full ${DOT[tone] ?? DOT.neutral}`} aria-hidden="true" />}
      {children}
    </Tag>
  )
}

/** Apple-style segmented control. options: [{ value, label }] */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
