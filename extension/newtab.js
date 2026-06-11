// Embebe o dashboard num iframe e injeta os topSites via postMessage —
// a API chrome.topSites só existe em contexto de extensão, o dashboard
// em si é uma página web normal.
const DEFAULT_URL = 'http://dockeralho:8484'
const api = typeof browser !== 'undefined' ? browser : chrome

async function getDashboardUrl() {
  const stored = await api.storage.sync.get({ dashboardUrl: DEFAULT_URL })
  return stored.dashboardUrl.replace(/\/$/, '')
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
  const url = await getDashboardUrl()
  const origin = new URL(url).origin

  const iframe = document.createElement('iframe')
  iframe.src = url
  iframe.allow = 'clipboard-write'
  document.body.appendChild(iframe)

  let sent = false
  const sendTopSites = () => {
    if (sent || !api.topSites) return
    api.topSites.get((sites) => {
      // Firefox devolve promise, Chrome usa callback — normalizar
      Promise.resolve(sites ?? api.topSites.get()).then((list) => {
        if (!Array.isArray(list)) return
        iframe.contentWindow.postMessage(
          { type: 'midgard:topsites', sites: list.map((s) => ({ title: s.title, url: s.url })) },
          origin,
        )
        sent = true
      })
    })
  }

  iframe.addEventListener('load', () => {
    // pequeno atraso para o React montar o listener
    setTimeout(sendTopSites, 300)
    setTimeout(sendTopSites, 1500)
  })
  iframe.addEventListener('error', showSetup)
}

init()
