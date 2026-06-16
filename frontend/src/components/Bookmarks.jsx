import React from 'react'
import Icon from './Icons.jsx'
import { useLocalStorage, isInternal } from '../api.js'

function normalize(url) {
  const u = url.trim()
  if (!u) return ''
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

function BmIcon({ url, label }) {
  const [broken, setBroken] = React.useState(false)
  let host = ''
  try {
    host = new URL(url).hostname
  } catch {}
  if (!host || broken || isInternal(host)) {
    return <span className="bm-letter">{(label || host || '?')[0].toUpperCase()}</span>
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

export default function Bookmarks() {
  const [items, setItems] = useLocalStorage('midgard:bookmarks', [])
  const [adding, setAdding] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [url, setUrl] = React.useState('')

  const add = (e) => {
    e.preventDefault()
    const finalUrl = normalize(url)
    if (!finalUrl) return
    let host = ''
    try {
      host = new URL(finalUrl).hostname
    } catch {
      return
    }
    setItems((prev) => [...prev, { title: title.trim() || host, url: finalUrl }])
    setTitle('')
    setUrl('')
    setAdding(false)
  }

  const remove = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i))

  return (
    <div className="bookmarks">
      <div className="bm-row">
        {items.map((b, i) => (
          <div key={b.url + i} className="bm">
            <a className="bm-link" href={b.url} target="_top" title={b.url}>
              <BmIcon url={b.url} label={b.title} />
              <span>{b.title}</span>
            </a>
            <button
              className="bm-remove"
              aria-label={`Remover ${b.title}`}
              onClick={() => remove(i)}
            >
              <Icon name="x" size={11} />
            </button>
          </div>
        ))}
        <button className="bm-add" aria-label="Adicionar atalho" onClick={() => setAdding((a) => !a)}>
          <Icon name="plus" size={16} />
        </button>
      </div>

      {adding && (
        <form className="bm-form" onSubmit={add}>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome (opcional)"
            aria-label="Nome do atalho"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL — ex.: proxmox.lan ou https://…"
            aria-label="URL do atalho"
          />
          <button type="submit" className="bm-save">Guardar</button>
          <button type="button" className="bm-cancel" onClick={() => setAdding(false)}>
            <Icon name="x" size={14} />
          </button>
        </form>
      )}
    </div>
  )
}
