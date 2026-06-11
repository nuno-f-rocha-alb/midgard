// Embebe o dashboard num iframe e injeta os topSites via postMessage —
// a API chrome.topSites só existe em contexto de extensão, o dashboard
// em si é uma página web normal.
const DEFAULTS = { dashboardUrl: 'http://dockeralho.lan:8484', accentColor: '#ff8c42' }
const api = typeof browser !== 'undefined' ? browser : chrome

async function getSettings() {
  const stored = await api.storage.sync.get(DEFAULTS)
  return { url: stored.dashboardUrl.replace(/\/$/, ''), accent: stored.accentColor }
}

function showSetup() {
  const div = document.createElement('div')
  div.id = 'setup'
  div.innerHTML =
    '<h2>Midgard não responde</h2>' +
    '<p>Confirma o URL do dashboard nas opções da extensão.</p>'
  document.body.appendChild(div)
}

async function init() {
  const { url, accent } = await getSettings()
  const origin = new URL(url).origin

  const iframe = document.createElement('iframe')
  iframe.src = url
  iframe.allow = 'clipboard-write'
  document.body.appendChild(iframe)

  const post = (msg) => iframe.contentWindow.postMessage(msg, origin)

  let sent = false
  const sendState = () => {
    // accent não depende de API nenhuma; enviar sempre
    post({ type: 'midgard:accent', color: accent })
    if (sent || !api.topSites) return
    api.topSites.get((sites) => {
      // Firefox devolve promise, Chrome usa callback — normalizar
      Promise.resolve(sites ?? api.topSites.get()).then((list) => {
        if (!Array.isArray(list)) return
        post({ type: 'midgard:topsites', sites: list.map((s) => ({ title: s.title, url: s.url })) })
        sent = true
      })
    })
  }

  iframe.addEventListener('load', () => {
    // pequeno atraso para o React montar o listener
    setTimeout(sendState, 300)
    setTimeout(sendState, 1500)
  })
  iframe.addEventListener('error', showSetup)
}

init()
