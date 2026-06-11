import React from 'react'
import Icon from './Icons.jsx'
import { applyAccent } from '../api.js'

const DEFAULT = '#ff8c42'

export default function Settings() {
  const [open, setOpen] = React.useState(false)
  const [color, setColor] = React.useState(
    () => localStorage.getItem('midgard:accent') || DEFAULT,
  )

  const change = (hex) => {
    setColor(hex)
    applyAccent(hex)
    localStorage.setItem('midgard:accent', hex)
  }

  return (
    <div className="settings">
      <button
        className="settings-btn"
        aria-label="Definições"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="gear" size={18} />
      </button>
      {open && (
        <div className="settings-panel">
          <label className="settings-row">
            <span>Cor de destaque</span>
            <input type="color" value={color} onChange={(e) => change(e.target.value)} />
          </label>
          <button className="settings-reset" onClick={() => change(DEFAULT)}>
            Repor laranja
          </button>
        </div>
      )}
    </div>
  )
}
