import React from 'react'

function Tile({ svc }) {
  const icon = svc.icon
    ? `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${svc.icon}.png`
    : null
  return (
    <a className="tile" href={svc.url} target="_top" title={`${svc.name}${svc.latency_ms != null ? ` · ${svc.latency_ms}ms` : ''}`}>
      <span className={`dot ${svc.status === 'up' ? 'up' : svc.status === 'down' ? 'down' : ''}`} />
      {icon ? (
        <img src={icon} alt="" onError={(e) => { e.target.replaceWith(Object.assign(document.createElement('span'), { className: 'tile-letter', textContent: svc.name[0] })) }} />
      ) : (
        <span className="tile-letter">{svc.name[0]}</span>
      )}
      <span className="tile-name">{svc.name}</span>
    </a>
  )
}

export default function Services({ services, portainer }) {
  if (!services?.ok) return null
  const groups = services.data?.groups || []
  const unhealthy = portainer?.ok
    ? (portainer.data?.endpoints || []).flatMap((e) => e.unhealthy || [])
    : []

  return (
    <section className="section">
      {unhealthy.length > 0 && (
        <div className="alert">⚠ containers unhealthy: {unhealthy.join(', ')}</div>
      )}
      {groups.map((g) => (
        <div key={g.name} className="service-group">
          <h2>{g.name}</h2>
          <div className="tile-grid">
            {g.services.map((s) => (
              <Tile key={s.name} svc={s} />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
