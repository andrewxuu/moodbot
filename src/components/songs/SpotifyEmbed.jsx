import { useEffect, useRef } from 'react'

let apiPromise = null

function loadIframeApi() {
  apiPromise ??= new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve
    const script = document.createElement('script')
    script.src = 'https://open.spotify.com/embed/iframe-api/v1'
    script.async = true
    script.onerror = () => {
      apiPromise = null
      reject(new Error('Spotify’s player couldn’t load.'))
    }
    document.body.appendChild(script)
  })
  return apiPromise
}

export default function SpotifyEmbed({ uri }) {
  const hostRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let controller = null

    loadIframeApi()
      .then((api) => {
        if (cancelled || !hostRef.current) return
        const el = document.createElement('div')
        hostRef.current.replaceChildren(el)
        api.createController(el, { uri, width: '100%', height: 80 }, (c) => {
          if (cancelled) return c.destroy()
          controller = c
          const iframe = hostRef.current?.querySelector('iframe')
          if (iframe) {
            iframe.setAttribute('scrolling', 'no')
            iframe.style.display = 'block'
          }
          c.addListener('ready', () => c.play())
        })
      })
      .catch(() => {})

    return () => {
      cancelled = true
      controller?.destroy()
    }
  }, [uri])

  return <div ref={hostRef} className="h-20 w-full min-w-0 flex-1 overflow-hidden rounded-[12px] bg-track [&_iframe]:block [&_iframe]:w-full" />
}