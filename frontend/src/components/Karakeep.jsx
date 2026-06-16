import React from 'react'
import { isInternal } from '../api.js'

function Thumb({ b }) {
  const [broken, setBroken] = React.useState(false)
  const src = !broken ? b.image || b.favicon : null
  if (src) {
    return <img className="kk-thumb" src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
  }
  let host = ''
  try {
    host = new URL(b.url).hostname
  } catch {}
  return (
    <div className="kk-thumb kk-thumb-fallback">
      <span>{(b.title || host || '?')[0].toUpperCase()}</span>
    </div>
  )
}

export default function Karakeep({ karakeep }) {
  if (!karakeep) return null

  const list = karakeep.data?.list
  const title = list ? `Guardados · ${list}` : 'Guardados'

  if (!karakeep.ok) {
    return (
      <section className="section">
        <h2>{title}</h2>
        <div className="error-card">Karakeep: {karakeep.error}</div>
      </section>
    )
  }

  const items = karakeep.data?.bookmarks || []
  if (!items.length) return null

  return (
    <section className="section">
      <h2>{title}</h2>
      <div className="kk-grid">
        {items.map((b) => (
          <a key={b.id} className="kk-card" href={b.url} target="_top" title={b.title}>
            <Thumb b={b} />
            <span className="kk-title">{b.title}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
