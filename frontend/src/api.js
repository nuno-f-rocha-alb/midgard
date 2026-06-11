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
