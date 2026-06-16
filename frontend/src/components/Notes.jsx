import React from 'react'
import Icon from './Icons.jsx'
import { useLocalStorage } from '../api.js'

export default function Notes() {
  const [items, setItems] = useLocalStorage('midgard:notes', [])
  const [draft, setDraft] = React.useState('')

  // migração: notas antigas eram texto livre (string) → vira itens da checklist
  React.useEffect(() => {
    if (typeof items === 'string') {
      setItems(
        items
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((text) => ({ text, done: false })),
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const list = Array.isArray(items) ? items : []

  const add = (e) => {
    e.preventDefault()
    const t = draft.trim()
    if (!t) return
    setItems([...list, { text: t, done: false }])
    setDraft('')
  }
  const toggle = (i) =>
    setItems(list.map((it, idx) => (idx === i ? { ...it, done: !it.done } : it)))
  const remove = (i) => setItems(list.filter((_, idx) => idx !== i))
  const clearDone = () => setItems(list.filter((it) => !it.done))

  const doneCount = list.filter((it) => it.done).length

  return (
    <div className="card widget notes">
      <div className="widget-title">
        Notas
        {doneCount > 0 && (
          <button className="notes-clear" onClick={clearDone}>
            limpar feitos ({doneCount})
          </button>
        )}
      </div>

      {list.length > 0 && (
        <ul className="checklist">
          {list.map((it, i) => (
            <li key={i} className={`check-item ${it.done ? 'done' : ''}`}>
              <button
                className="check-box"
                role="checkbox"
                aria-checked={it.done}
                aria-label={it.text}
                onClick={() => toggle(i)}
              >
                {it.done && <Icon name="check" size={12} />}
              </button>
              <span className="check-text" onClick={() => toggle(i)}>{it.text}</span>
              <button
                className="check-remove"
                aria-label={`Apagar ${it.text}`}
                onClick={() => remove(i)}
              >
                <Icon name="x" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="notes-add" onSubmit={add}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nova linha + Enter…"
          aria-label="Nova nota"
        />
      </form>
    </div>
  )
}
