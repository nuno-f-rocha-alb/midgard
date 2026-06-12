import React from 'react'
import Icon from './Icons.jsx'

const BANGS = {
  yt: 'https://www.youtube.com/results?search_query=',
  gh: 'https://github.com/search?q=',
  w: 'https://pt.wikipedia.org/wiki/Special:Search?search=',
  amz: 'https://www.amazon.es/s?k=',
  cm: 'https://www.cardmarket.com/en/Magic/Products/Search?searchString=',
}

const DEFAULT_ENGINE = 'https://www.google.com/search?q='

export default function SearchBar() {
  const inputRef = React.useRef(null)
  React.useEffect(() => inputRef.current?.focus(), [])

  // o dashboard corre dentro de um iframe (extensão new tab); navegar o próprio
  // iframe para o Google falha (X-Frame-Options) — tem de ser a janela de topo
  const go = (url) => {
    try {
      window.top.location.href = url
    } catch {
      window.open(url, '_blank')
    }
  }

  const submit = (e) => {
    e.preventDefault()
    const raw = inputRef.current.value.trim()
    if (!raw) return
    // URL direto
    if (/^https?:\/\//.test(raw) || (/^[\w-]+(\.[\w-]+)+/.test(raw) && !raw.includes(' '))) {
      go(raw.startsWith('http') ? raw : `https://${raw}`)
      return
    }
    // bangs: "!yt nome do video"
    const bang = raw.match(/^!(\w+)\s+(.*)/)
    if (bang && BANGS[bang[1]]) {
      go(BANGS[bang[1]] + encodeURIComponent(bang[2]))
      return
    }
    go(DEFAULT_ENGINE + encodeURIComponent(raw))
  }

  return (
    <form className="search" onSubmit={submit} role="search">
      <Icon name="search" size={18} className="search-icon" />
      <input
        ref={inputRef}
        type="text"
        aria-label="Pesquisar na web"
        placeholder="Pesquisar… (!yt !gh !w !amz !cm)"
        autoComplete="off"
      />
    </form>
  )
}
