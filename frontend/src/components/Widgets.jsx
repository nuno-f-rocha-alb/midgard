import React from 'react'
import { fmtBytes, fmtUptime } from '../api.js'

function Widget({ title, ok, error, children }) {
  return (
    <div className={`card widget ${ok === false ? 'widget-error' : ''}`}>
      <div className="widget-title">{title}</div>
      {ok === false ? <div className="widget-err-msg">{error}</div> : children}
    </div>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div className="stat">
      <span className={`stat-value ${tone || ''}`}>{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function Pihole({ p }) {
  const d = p.data || {}
  const pct = d.percent_blocked != null ? `${d.percent_blocked.toFixed(1)}%` : '—'
  return (
    <Widget title="Pi-hole" ok={p.ok} error={p.error}>
      <div className="stat-row">
        <Stat label="queries hoje" value={d.total_queries?.toLocaleString('pt-PT')} />
        <Stat label="bloqueadas" value={d.blocked?.toLocaleString('pt-PT')} tone="accent" />
        <Stat label="% bloqueio" value={pct} tone="accent" />
        <Stat label="clientes" value={d.active_clients} />
      </div>
    </Widget>
  )
}

function Qbit({ q }) {
  const d = q.data || {}
  return (
    <Widget title="qBittorrent" ok={q.ok} error={q.error}>
      <div className="stat-row">
        <Stat label="download" value={`↓ ${fmtBytes(d.dl_speed)}`} tone="ok-text" />
        <Stat label="upload" value={`↑ ${fmtBytes(d.up_speed)}`} />
        <Stat label="a sacar" value={d.downloading} />
        <Stat label="em seed" value={d.seeding} />
      </div>
    </Widget>
  )
}

function Speedtest({ s }) {
  const d = s.data || {}
  return (
    <Widget title="Speedtest" ok={s.ok} error={s.error}>
      <div className="stat-row">
        <Stat label="down" value={d.download_mbps != null ? `${d.download_mbps} Mbps` : null} />
        <Stat label="up" value={d.upload_mbps != null ? `${d.upload_mbps} Mbps` : null} />
        <Stat label="ping" value={d.ping_ms != null ? `${Math.round(d.ping_ms)} ms` : null} />
      </div>
      {d.created_at && <div className="widget-foot">último teste: {new Date(d.created_at).toLocaleString('pt-PT')}</div>}
    </Widget>
  )
}

function Nas({ s }) {
  const d = s.data || {}
  const disks = d.disks || []
  const failed = d.failed || []
  return (
    <Widget title="neverNAS · discos" ok={s.ok} error={s.error}>
      {failed.length > 0 && <div className="alert">⚠ SMART falhou: {failed.join(', ')}</div>}
      <div className="disk-grid">
        {disks.map((disk) => (
          <div key={disk.wwn} className="disk" title={disk.model}>
            <span className={`dot ${disk.status === 0 ? 'up' : 'down'}`} />
            <span>{disk.name}</span>
            <span className="muted">{disk.temp != null ? `${disk.temp}°C` : ''}</span>
          </div>
        ))}
      </div>
    </Widget>
  )
}

function Vps({ b }) {
  const d = b.data || {}
  const peers = Array.isArray(d.wireguard_peers) ? d.wireguard_peers : []
  return (
    <Widget title="VPS · bifrost" ok={b.ok} error={b.error}>
      <div className="stat-row">
        <Stat label="containers" value={d.containers_total != null ? `${d.containers_running}/${d.containers_total}` : null} />
        <Stat label="peers WG" value={peers.length} />
        <Stat label="bans ativos" value={d.crowdsec_bans} tone={d.crowdsec_bans > 0 ? 'accent' : ''} />
        <Stat label="updates" value={d.updates_pending} tone={d.updates_pending > 0 ? 'warn-text' : ''} />
      </div>
      {d.disk?.percent != null && <div className="widget-foot">disco: {d.disk.percent}% usado</div>}
    </Widget>
  )
}

function Proxmox({ p }) {
  const nodes = p.data?.nodes || []
  return (
    <Widget title="Proxmox" ok={p.ok} error={p.error}>
      {nodes.map((n) => (
        <div key={n.name} className="pve-node">
          <div className="pve-head">
            <span className={`dot ${n.online ? 'up' : 'down'}`} />
            <strong>{n.name}</strong>
            {n.online && (
              <span className="muted">
                cpu {n.cpu}% · {n.running}/{n.total} guests · up {fmtUptime(n.uptime)}
              </span>
            )}
          </div>
          {n.online && (
            <div className="guest-list">
              {n.guests.map((g) => (
                <span key={g.vmid} className={`guest ${g.status}`} title={`${g.type} ${g.vmid}`}>
                  {g.name}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </Widget>
  )
}

function Emby({ e }) {
  const d = e.data || {}
  const playing = d.now_playing || []
  return (
    <Widget title="Emby" ok={e.ok} error={e.error}>
      {playing.length === 0 ? (
        <div className="muted">ninguém a ver nada</div>
      ) : (
        playing.map((s, i) => (
          <div key={i} className="emby-session">
            {s.paused ? '⏸' : '▶'} <strong>{s.title}</strong>
            <span className="muted"> — {s.user} · {s.client}</span>
          </div>
        ))
      )}
      {d.counts?.movies != null && (
        <div className="widget-foot">
          {d.counts.movies} filmes · {d.counts.series} séries · {d.counts.episodes} episódios
        </div>
      )}
    </Widget>
  )
}

function Crafty({ c }) {
  const servers = c.data?.servers || []
  return (
    <Widget title="Minecraft · Crafty" ok={c.ok} error={c.error}>
      {servers.map((s) => (
        <div key={s.id} className="crafty-server">
          <span className={`dot ${s.running ? 'up' : 'down'}`} />
          <strong>{s.name}</strong>
          <span className="muted">
            {s.running ? `${s.online ?? 0}/${s.max_players ?? '?'} jogadores · ${s.version || ''}` : 'parado'}
          </span>
        </div>
      ))}
    </Widget>
  )
}

export default function Widgets({ state }) {
  const order = [
    ['pihole', Pihole, 'p'],
    ['qbittorrent', Qbit, 'q'],
    ['speedtest', Speedtest, 's'],
    ['scrutiny', Nas, 's'],
    ['bifrost', Vps, 'b'],
    ['proxmox', Proxmox, 'p'],
    ['emby', Emby, 'e'],
    ['crafty', Crafty, 'c'],
  ]
  const active = order.filter(([key]) => state[key])
  if (!active.length) return null
  return (
    <section className="section">
      <h2>Serviços</h2>
      <div className="widget-grid">
        {active.map(([key, Component, prop]) => (
          <Component key={key} {...{ [prop]: state[key] }} />
        ))}
      </div>
    </section>
  )
}
