const api = typeof browser !== 'undefined' ? browser : chrome
const input = document.getElementById('url')
const accent = document.getElementById('accent')
const accentVal = document.getElementById('accent-val')
const saved = document.getElementById('saved')

const DEFAULTS = { dashboardUrl: 'http://dockeralho.lan:8484', accentColor: '#ff8c42' }

api.storage.sync.get(DEFAULTS, (items) => {
  input.value = items.dashboardUrl
  accent.value = items.accentColor
  accentVal.textContent = items.accentColor
})

accent.addEventListener('input', () => {
  accentVal.textContent = accent.value
})

document.getElementById('save').addEventListener('click', () => {
  api.storage.sync.set(
    { dashboardUrl: input.value.trim(), accentColor: accent.value },
    () => {
      saved.textContent = 'guardado ✓'
      setTimeout(() => (saved.textContent = ''), 2000)
    },
  )
})
