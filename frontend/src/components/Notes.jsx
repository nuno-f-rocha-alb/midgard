import React from 'react'
import { useLocalStorage } from '../api.js'

export default function Notes() {
  const [text, setText] = useLocalStorage('midgard:notes', '')
  return (
    <div className="card widget notes">
      <div className="widget-title">Notas</div>
      <textarea
        className="notes-area"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escreve aqui — grava sozinho neste browser."
        aria-label="Notas"
        spellCheck="false"
      />
    </div>
  )
}
