import React from 'react'
import { useDashboard } from './api.js'
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

export default function App() {
  const state = useDashboard()
  return (
    <div className="page">
      <header className="hero">
        <Clock />
        <SearchBar />
        <TopSites />
      </header>
      <main>
        <Machines beszel={state.beszel} />
        <Widgets state={state} />
        <Services services={state.services} portainer={state.portainer} />
      </main>
    </div>
  )
}
