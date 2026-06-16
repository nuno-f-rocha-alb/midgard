import React from 'react'
import { isInternal } from '../api.js'

function TopSiteIcon({ host, label }) {
  const [broken, setBroken] = React.useState(false)
  if (!host || broken || isInternal(host)) {
    return <span className="topsite-letter">{(label || host || '?')[0].toUpperCase()}</span>
  }
  return (
    <img
      src={`https://icons.duckduckgo.com/ip3/${host}.ico`}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
}

// Os "mais visitados" chegam da extensão via postMessage (chrome.topSites
// só existe em contexto de extensão). Sem extensão, mostra os últimos recebidos
// (cache em localStorage) ou nada.
export default function TopSites() {
  const [sites, setSites] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem('midgard:topsites') || '[]')
    } catch {
      return []
    }
  })

  React.useEffect(() => {
    const onMessage = (e) => {
      if (e.data?.type !== 'midgard:topsites' || !Array.isArray(e.data.sites)) return
      const top = e.data.sites.slice(0, 12)
      setSites(top)
      localStorage.setItem('midgard:topsites', JSON.stringify(top))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (!sites.length) return null

  return (
    <div className="topsites">
      {sites.map((s) => {
        let host = ''
        try {
          host = new URL(s.url).hostname
        } catch {}
        return (
          <a key={s.url} className="topsite" href={s.url} target="_top" title={s.title}>
            <TopSiteIcon host={host} label={s.title} />
            <span>{s.title || host}</span>
          </a>
        )
      })}
    </div>
  )
}
