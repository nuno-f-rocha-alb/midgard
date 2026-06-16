import React from 'react'
import { isInternal } from '../api.js'

// fontes por ordem de qualidade: screenshot da página → banner (og:image) →
// imagem externa → favicon → inicial. Os assets passam pelo proxy autenticado.
function Thumb({ b }) {
  const sources = []
  if (b.screenshot) sources.push(`/api/karakeep/asset/${b.screenshot}`)
  if (b.asset) sources.push(`/api/karakeep/asset/${b.asset}`)
  if (b.image) sources.push(b.image)
  if (b.favicon) sources.push(b.favicon)
  const [idx, setIdx] = React.useState(0)

  if (idx < sources.length) {
    return (
      <img
        className="kk-thumb"
        src={sources[idx]}
        alt=""
        loading="lazy"
        onError={() => setIdx((i) => i + 1)}
      />
    )
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
      <div className="kk-row">
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
