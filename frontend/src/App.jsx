import React from 'react'
import { useDashboard, useAccent } from './api.js'
import SearchBar from './components/SearchBar.jsx'
import TopSites from './components/TopSites.jsx'
import Machines from './components/Machines.jsx'
import Widgets from './components/Widgets.jsx'
import Services from './components/Services.jsx'

function Clock() {
  const [now, setNow] = React.useState(new Date())
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const time = now.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return (
    <div className="clock">
      <div className="clock-time">{time}</div>
      <div className="clock-date">{date}</div>
    </div>
  )
}

function Skeleton() {
  return (
    <section className="section" aria-label="a carregar">
      <div className="skeleton-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card skeleton" />
        ))}
      </div>
    </section>
  )
}

export default function App() {
  const state = useDashboard()
  useAccent()
  const loading = Object.keys(state).length === 0
  return (
    <div className="page">
      <header className="hero">
        <Clock />
        <SearchBar />
        <TopSites />
      </header>
      <main>
        {loading ? (
          <Skeleton />
        ) : (
          <>
            <Services services={state.services} portainer={state.portainer} />
            <Machines beszel={state.beszel} />
            <Widgets state={state} />
          </>
        )}
      </main>
    </div>
  )
}
