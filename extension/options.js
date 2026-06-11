const api = typeof browser !== 'undefined' ? browser : chrome
const input = document.getElementById('url')
const saved = document.getElementById('saved')

api.storage.sync.get({ dashboardUrl: 'http://dockeralho:8484' }, (items) => {
  input.value = items.dashboardUrl
})

document.getElementById('save').addEventListener('click', () => {
  api.storage.sync.set({ dashboardUrl: input.value.trim() }, () => {
    saved.textContent = 'guardado ✓'
    setTimeout(() => (saved.textContent = ''), 2000)
  })
})
