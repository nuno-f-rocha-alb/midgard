import React from 'react'

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

  const submit = (e) => {
    e.preventDefault()
    const raw = inputRef.current.value.trim()
    if (!raw) return
    // URL direto
    if (/^https?:\/\//.test(raw) || (/^[\w-]+(\.[\w-]+)+/.test(raw) && !raw.includes(' '))) {
      location.href = raw.startsWith('http') ? raw : `https://${raw}`
      return
    }
    // bangs: "!yt nome do video"
    const bang = raw.match(/^!(\w+)\s+(.*)/)
    if (bang && BANGS[bang[1]]) {
      location.href = BANGS[bang[1]] + encodeURIComponent(bang[2])
      return
    }
    location.href = DEFAULT_ENGINE + encodeURIComponent(raw)
  }

  return (
    <form className="search" onSubmit={submit}>
      <span className="search-icon">⌕</span>
      <input
        ref={inputRef}
        type="text"
        placeholder="Pesquisar… (!yt !gh !w !amz !cm)"
        autoComplete="off"
      />
    </form>
  )
}
