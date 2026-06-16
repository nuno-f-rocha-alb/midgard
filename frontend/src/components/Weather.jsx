import React from 'react'
import Icon from './Icons.jsx'
import { useLocalStorage } from '../api.js'

// WMO weather code → ícone + descrição (pt)
function wmo(code) {
  if (typeof code !== 'number' || Number.isNaN(code)) return { icon: 'cloud', label: 'Desconhecido' }
  if (code === 0) return { icon: 'sun', label: 'Céu limpo' }
  if (code <= 2) return { icon: 'cloud-sun', label: 'Pouco nublado' }
  if (code === 3) return { icon: 'cloud', label: 'Nublado' }
  if (code <= 48) return { icon: 'cloud-fog', label: 'Nevoeiro' }
  if (code <= 57) return { icon: 'cloud-rain', label: 'Chuvisco' }
  if (code <= 67) return { icon: 'cloud-rain', label: 'Chuva' }
  if (code <= 77) return { icon: 'cloud-snow', label: 'Neve' }
  if (code <= 82) return { icon: 'cloud-rain', label: 'Aguaceiros' }
  if (code <= 86) return { icon: 'cloud-snow', label: 'Aguaceiros de neve' }
  return { icon: 'cloud-lightning', label: 'Trovoada' }
}

const GEO = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST = 'https://api.open-meteo.com/v1/forecast'

export default function Weather() {
  const [loc, setLoc] = useLocalStorage('midgard:weather-loc', null)
  const [data, setData] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [editing, setEditing] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!loc) return
    let alive = true
    const load = async () => {
      try {
        const u = new URL(FORECAST)
        u.search = new URLSearchParams({
          latitude: loc.lat,
          longitude: loc.lon,
          current: 'temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m',
          daily: 'temperature_2m_max,temperature_2m_min',
          timezone: 'auto',
          forecast_days: '1',
        }).toString()
        const r = await fetch(u)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = await r.json()
        if (alive) {
          setData(j)
          setError(null)
        }
      } catch (e) {
        if (alive) setError(String(e))
      }
    }
    load()
    const t = setInterval(load, 30 * 60 * 1000) // 30 min
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [loc])

  const search = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setBusy(true)
    try {
      const u = new URL(GEO)
      u.search = new URLSearchParams({ name: query.trim(), count: '1', language: 'pt' }).toString()
      const r = await fetch(u)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = await r.json()
      const hit = (j.results || [])[0]
      if (!hit) {
        setError('cidade não encontrada')
        return
      }
      setLoc({
        name: [hit.name, hit.admin1, hit.country_code].filter(Boolean).join(', '),
        lat: hit.latitude,
        lon: hit.longitude,
      })
      setEditing(false)
      setQuery('')
      setError(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  // estado vazio / edição de cidade
  if (!loc || editing) {
    return (
      <div className="card widget weather">
        <div className="widget-title">Meteorologia</div>
        <form className="weather-search" onSubmit={search}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="A tua cidade…"
            aria-label="Cidade para a meteorologia"
          />
          <button type="submit" disabled={busy}>{busy ? '…' : 'OK'}</button>
        </form>
        {loc && (
          <button className="weather-cancel" onClick={() => setEditing(false)}>cancelar</button>
        )}
        {error && <div className="widget-foot">{error}</div>}
      </div>
    )
  }

  const cur = data?.current
  const w = cur ? wmo(cur.weather_code) : null
  const hi = data?.daily?.temperature_2m_max?.[0]
  const lo = data?.daily?.temperature_2m_min?.[0]

  return (
    <div className="card widget weather">
      <div className="widget-title">
        Meteorologia
        <button className="weather-edit" aria-label="Mudar cidade" onClick={() => setEditing(true)}>
          <Icon name="pencil" size={12} />
        </button>
      </div>
      {error && !cur ? (
        <div className="widget-err-msg">{error}</div>
      ) : !cur ? (
        <div className="muted">a carregar…</div>
      ) : (
        <>
          <div className="weather-now">
            <Icon name={w.icon} size={44} className="weather-icon" />
            <div className="weather-temp">{Math.round(cur.temperature_2m)}°</div>
            <div className="weather-meta">
              <div className="weather-cond">{w.label}</div>
              <div className="muted">{loc.name}</div>
            </div>
          </div>
          <div className="weather-extra">
            <span>máx <b>{Math.round(hi)}°</b></span>
            <span>mín <b>{Math.round(lo)}°</b></span>
            <span>sente-se <b>{Math.round(cur.apparent_temperature)}°</b></span>
            <span>humid. <b>{cur.relative_humidity_2m}%</b></span>
            <span>vento <b>{Math.round(cur.wind_speed_10m)} km/h</b></span>
          </div>
        </>
      )}
    </div>
  )
}
