import React from 'react'
import { fmtUptime } from '../api.js'

function Bar({ value, label }) {
  const pct = value == null ? 0 : Math.min(100, Math.max(0, value))
  const tone = pct > 90 ? 'crit' : pct > 75 ? 'warn' : 'ok'
  return (
    <div className="bar-row" title={`${label}: ${value == null ? '—' : pct.toFixed(1) + '%'}`}>
      <span className="bar-label">{label}</span>
      <div className="bar">
        <div className={`bar-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="bar-value">{value == null ? '—' : `${Math.round(pct)}%`}</span>
    </div>
  )
}

export default function Machines({ beszel }) {
  if (!beszel) return null
  if (!beszel.ok)
    return (
      <section className="section">
        <h2>Máquinas</h2>
        <div className="error-card">beszel: {beszel.error}</div>
      </section>
    )

  const systems = beszel.data?.systems || []
  return (
    <section className="section">
      <h2>Máquinas</h2>
      <div className="machine-grid">
        {systems.map((m) => (
          <div key={m.name} className={`card machine ${m.status !== 'up' ? 'offline' : ''}`}>
            <div className="machine-head">
              <span className={`dot ${m.status === 'up' ? 'up' : 'down'}`} />
              <span className="machine-name">{m.name}</span>
              <span className="machine-uptime">{fmtUptime(m.uptime)}</span>
            </div>
            <Bar value={m.cpu} label="CPU" />
            <Bar value={m.mem} label="RAM" />
            <Bar value={m.disk} label="Disco" />
          </div>
        ))}
      </div>
    </section>
  )
}
