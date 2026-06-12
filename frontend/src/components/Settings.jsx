import React from 'react'
import Icon from './Icons.jsx'
import { applyAccent, applyThemePref } from '../api.js'

const DEFAULT_ACCENT = '#ff8c42'

const THEME_OPTIONS = [
  { value: 'system', icon: 'monitor', label: 'Seguir o sistema' },
  { value: 'dark', icon: 'moon', label: 'Escuro' },
  { value: 'light', icon: 'sun', label: 'Claro' },
]

export default function Settings() {
  const [open, setOpen] = React.useState(false)
  const [color, setColor] = React.useState(
    () => localStorage.getItem('midgard:accent') || DEFAULT_ACCENT,
  )
  const [theme, setTheme] = React.useState(
    () => localStorage.getItem('midgard:theme') || 'system',
  )

  const changeColor = (hex) => {
    setColor(hex)
    applyAccent(hex)
    localStorage.setItem('midgard:accent', hex)
  }

  const changeTheme = (mode) => {
    setTheme(mode)
    localStorage.setItem('midgard:theme', mode)
    applyThemePref()
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
          <div className="settings-row">
            <span>Tema</span>
            <div className="theme-toggle" role="radiogroup" aria-label="Tema">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`theme-opt ${theme === opt.value ? 'active' : ''}`}
                  role="radio"
                  aria-checked={theme === opt.value}
                  aria-label={opt.label}
                  title={opt.label}
                  onClick={() => changeTheme(opt.value)}
                >
                  <Icon name={opt.icon} size={15} />
                </button>
              ))}
            </div>
          </div>
          <label className="settings-row">
            <span>Cor de destaque</span>
            <input type="color" value={color} onChange={(e) => changeColor(e.target.value)} />
          </label>
          <button className="settings-reset" onClick={() => changeColor(DEFAULT_ACCENT)}>
            Repor laranja
          </button>
        </div>
      )}
    </div>
  )
}
