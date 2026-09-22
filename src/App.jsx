import { Outlet, NavLink } from 'react-router-dom'

export default function App() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <NavLink to="/" className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft ring-1 ring-accent/40">
            <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_18px_4px_rgba(34,211,238,0.6)]" />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight">Giorgio&apos;s Job Hunt</span>
            <span className="block text-xs text-white/45">entry-level cybersecurity, 2026</span>
          </span>
        </NavLink>
        <nav className="flex items-center gap-1 text-sm">
          <Tab to="/" end>
            Dashboard
          </Tab>
          <Tab to="/private">Detail</Tab>
        </nav>
      </header>
      <Outlet />
      <footer className="mt-14 space-y-1 text-center text-xs text-white/35">
        <p>Built with React, Recharts and a Notion database. Aggregate numbers only on the public page.</p>
        <p>Detail decrypts encrypted rows locally with your passphrase — nothing is sent back to a server.</p>
      </footer>
    </div>
  )
}

function Tab({ to, end, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-full px-3.5 py-1.5 transition ${
          isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {children}
    </NavLink>
  )
}
