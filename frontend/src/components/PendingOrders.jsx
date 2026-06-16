import React from 'react'

// O SpoolWise corre à parte (porta 5000); o browser vai lá diretamente, daí o
// CORS configurado do lado do SpoolWise. Por omissão assume que está no mesmo
// host que serve o dashboard, na porta 5000. Override (ex.: outro host) em
// localStorage['midgard:spoolwise'] = 'http://dockeralho.lan:5000'.
const SPOOLWISE_URL =
  localStorage.getItem('midgard:spoolwise') ||
  `${location.protocol}//${location.hostname}:5000`

function fmtHours(h) {
  if (h == null) return '—'
  const whole = Math.floor(h)
  const m = Math.round((h - whole) * 60)
  return m ? `${whole}h ${m}m` : `${whole}h`
}

export default function PendingOrders() {
  const [state, setState] = React.useState({ status: 'loading' })

  React.useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        // timeout para não pendurar o polling se o SpoolWise não responder
        const r = await fetch(`${SPOOLWISE_URL}/api/orders/pending`, {
          signal: AbortSignal.timeout(12000),
        })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        if (alive) setState({ status: 'ok', data })
      } catch (e) {
        if (alive) setState({ status: 'error', error: String(e.message || e) })
      }
    }
    load()
    const t = setInterval(load, 30000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  // primeiro load: não mostra nada (evita "saltar" o layout)
  if (state.status === 'loading') return null

  const orders = state.data?.orders || []

  return (
    <section className="section">
      <h2>Encomendas pendentes</h2>
      {state.status === 'error' ? (
        <div className="error-card">SpoolWise: {state.error}</div>
      ) : orders.length === 0 ? (
        <div className="card muted">Sem encomendas pendentes.</div>
      ) : (
        <div className="order-grid">
          {orders.map((o) => (
            <a
              key={o.id}
              className="card order-card"
              href={`${SPOOLWISE_URL}/orders/${o.id}`}
              target="_top"
            >
              <div className="order-head">
                <span className="dot" />
                <span className="order-name">{o.name}</span>
                {o.quantity > 1 && <span className="muted">×{o.quantity}</span>}
              </div>
              <div className="order-meta muted">
                {o.customer || (o.is_internal ? 'interna' : 'sem cliente')}
                {' · '}
                {o.plates} {o.plates === 1 ? 'placa' : 'placas'}
                {' · '}
                {fmtHours(o.print_time_hours)}
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
