import { Outlet, NavLink, useLocation } from 'react-router-dom'

export default function App() {
  const { pathname } = useLocation()
  const onApps = pathname.startsWith('/private')

  return (
    <div className="min-h-screen">
      <header className="topbar sticky top-0 z-30">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5">
          <NavLink to="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            <span className="h-3.5 w-3.5 rounded-[4px] bg-ink" aria-hidden="true" />
            <span>Giorgio's Job Hunt</span>
          </NavLink>
          <nav className="segmented" aria-label="Sections">
            <NavLink to="/" end className={onApps ? '' : 'on'}>
              Overview
            </NavLink>
            <NavLink to="/private" className={onApps ? 'on' : ''}>
              Applications
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-10 sm:pt-14">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-5xl border-t border-hair px-5 py-6 text-xs text-faint">
        Public overview shows aggregates only. Applications decrypt locally in your browser.
      </footer>
    </div>
  )
}
