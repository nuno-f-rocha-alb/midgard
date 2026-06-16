import { useEffect, useState } from 'react'

// snapshot inicial via REST + updates incrementais via WebSocket
export function useDashboard() {
  const [state, setState] = useState({})

  useEffect(() => {
    let ws
    let closed = false
    let retry

    fetch('/api/snapshot')
      .then((r) => r.json())
      .then((snap) => setState((s) => ({ ...snap, ...s })))
      .catch(() => {})

    const connect = () => {
      ws = new WebSocket(
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`,
      )
      ws.onmessage = (e) => {
        try {
          const { name, payload } = JSON.parse(e.data)
          setState((s) => ({ ...s, [name]: payload }))
        } catch {}
      }
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 5000)
      }
    }
    connect()

    const ping = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) ws.send('ping')
    }, 30000)

    return () => {
      closed = true
      clearTimeout(retry)
      clearInterval(ping)
      ws?.close()
    }
  }, [])

  return state
}

// Estado persistido em localStorage (JSON). Mesmo padrão para atalhos/notas/meteo.
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw != null ? JSON.parse(raw) : initial
    } catch {
      return initial
    }
  })
  const set = (v) =>
    setValue((prev) => {
      const next = typeof v === 'function' ? v(prev) : v
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {}
      return next
    })
  return [value, set]
}

// hosts internos (LAN) não têm favicon público — usar inicial em vez de 404
export function isInternal(host) {
  return (
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    /\.(local|lan|home|internal)$/i.test(host) ||
    !host.includes('.')
  )
}

// Tema claro/escuro: 'system' segue o SO, 'light'/'dark' fixam. Aplica em <html data-theme>.
export function applyThemePref() {
  const mode = localStorage.getItem('midgard:theme') || 'system'
  const sysLight = window.matchMedia('(prefers-color-scheme: light)').matches
  const light = mode === 'light' || (mode === 'system' && sysLight)
  document.documentElement.dataset.theme = light ? 'light' : 'dark'
  return mode
}

export function useTheme() {
  useEffect(() => {
    applyThemePref()
    // se está em "system", reage quando o SO troca de tema
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => applyThemePref()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
}

// Aplica um accent hex (#rrggbb) como --accent-rgb; todo o resto do tema deriva daí.
export function applyAccent(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim())
  if (!m) return
  const n = parseInt(m[1], 16)
  const rgb = `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
  document.documentElement.style.setProperty('--accent-rgb', rgb)
}

// Lê o accent guardado (escolhido na extensão) e ouve atualizações via postMessage.
export function useAccent() {
  useEffect(() => {
    const saved = localStorage.getItem('midgard:accent')
    if (saved) applyAccent(saved)

    const onMessage = (e) => {
      if (e.data?.type !== 'midgard:accent' || !e.data.color) return
      // o seletor in-app manda; a extensão só semeia se ainda não há escolha local
      if (localStorage.getItem('midgard:accent')) return
      applyAccent(e.data.color)
      localStorage.setItem('midgard:accent', e.data.color)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])
}

export function fmtBytes(bps) {
  if (bps == null) return '—'
  if (bps >= 1e9) return (bps / 1e9).toFixed(1) + ' GB/s'
  if (bps >= 1e6) return (bps / 1e6).toFixed(1) + ' MB/s'
  if (bps >= 1e3) return (bps / 1e3).toFixed(0) + ' kB/s'
  return bps.toFixed(0) + ' B/s'
}

export function fmtUptime(seconds) {
  if (seconds == null) return '—'
  const d = Math.floor(seconds / 86400)
  if (d >= 1) return `${d}d`
  const h = Math.floor(seconds / 3600)
  if (h >= 1) return `${h}h`
  return `${Math.floor(seconds / 60)}m`
}
