import { Outlet, NavLink } from 'react-router-dom'

export default function App() {
  return (
    <div className="shell mx-auto flex min-h-screen max-w-[1400px] gap-0 lg:gap-6 lg:px-4 lg:py-4">
      <aside className="sidebar-desktop glass sticky top-4 flex h-[calc(100vh-2rem)] w-56 shrink-0 flex-col p-4">
        <NavLink to="/" className="mb-6 flex items-center gap-2.5 px-1">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft ring-1 ring-accent/35">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_14px_3px_rgba(61,214,245,0.55)]" />
          </span>
          <span>
            <span className="block text-[11px] font-bold tracking-[0.16em] text-accent">CAREER TRACK</span>
            <span className="block text-xs text-white/40">Giorgio · cyber</span>
          </span>
        </NavLink>

        <nav className="flex flex-1 flex-col gap-1">
          <SideTab to="/" end icon={IconOverview}>
            Overview
          </SideTab>
          <SideTab to="/private" icon={IconApps}>
            Applications
          </SideTab>
        </nav>

        <div className="mt-auto space-y-3 border-t border-white/8 pt-4">
          <div className="rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/8">
            <p className="text-sm font-medium text-white/85">Giorgio Pisano</p>
            <p className="text-[11px] text-white/40">Entry-level cybersecurity</p>
          </div>
          <NavLink
            to="/private"
            className="flex items-center justify-center rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            Unlock applications
          </NavLink>
        </div>
      </aside>

      <div className="min-w-0 flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-2 lg:pt-2">
        <header className="mb-6 flex items-center justify-between gap-4 lg:hidden">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft ring-1 ring-accent/35">
              <span className="h-2 w-2 rounded-full bg-accent" />
            </span>
            <span>
              <span className="block text-[11px] font-bold tracking-[0.14em] text-accent">CAREER TRACK</span>
              <span className="block text-xs text-white/45">Job hunt overview</span>
            </span>
          </NavLink>
          <nav className="flex items-center gap-1 text-sm">
            <MobileTab to="/" end>
              Overview
            </MobileTab>
            <MobileTab to="/private">Apps</MobileTab>
          </nav>
        </header>

        <Outlet />

        <footer className="mt-12 space-y-1 text-center text-xs text-white/35">
          <p>Public overview shows aggregates only. Applications decrypt locally in your browser.</p>
        </footer>
      </div>
    </div>
  )
}

function SideTab({ to, end, icon: Icon, children }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
      <Icon />
      {children}
    </NavLink>
  )
}

function MobileTab({ to, end, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-full px-3 py-1.5 transition ${
          isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function IconOverview() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="9" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function IconApps() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 4.5h11M2.5 8h11M2.5 11.5h7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
