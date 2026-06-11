import React from 'react'
import Icon from './Icons.jsx'

function TileIcon({ svc }) {
  const [failed, setFailed] = React.useState(false)
  if (!svc.icon || failed) return <span className="tile-letter">{svc.name[0]}</span>
  return (
    <img
      src={`https://cdn.jsdelivr.net/gh/selfhst/icons/png/${svc.icon}.png`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

function Tile({ svc }) {
  const statusLabel =
    svc.status === 'up' ? 'online' : svc.status === 'down' ? 'offline' : 'estado desconhecido'
  return (
    <a
      className="tile"
      href={svc.url}
      target="_top"
      title={`${svc.name} · ${statusLabel}${svc.latency_ms != null ? ` · ${svc.latency_ms}ms` : ''}`}
    >
      <span
        className={`dot ${svc.status === 'up' ? 'up' : svc.status === 'down' ? 'down' : ''}`}
        role="img"
        aria-label={statusLabel}
      />
      <TileIcon svc={svc} />
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
        <div className="alert">
          <Icon name="alert" size={14} label="aviso" /> containers unhealthy: {unhealthy.join(', ')}
        </div>
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
