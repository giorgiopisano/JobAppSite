import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import PublicDashboard from './pages/PublicDashboard.jsx'
import PrivateView from './pages/PrivateView.jsx'
import './index.css'

// HashRouter so /#/private works on GitHub Pages without a 404 fallback.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<PublicDashboard />} />
          <Route path="private" element={<PrivateView />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)
