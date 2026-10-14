import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop - Garante que ao mudar de rota ou carregar a página,
 * o scroll da janela e do contêiner principal seja sempre levado para o topo (topup).
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    const resetScroll = () => {
      // 1. Scroll window to top instantly
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' as ScrollBehavior,
      })

      // 2. Document element and body
      if (document.documentElement) {
        document.documentElement.scrollTop = 0
      }
      if (document.body) {
        document.body.scrollTop = 0
      }

      // 3. Root app element
      const root = document.getElementById('root')
      if (root) {
        root.scrollTop = 0
      }

      // 4. Main element and any custom scrollable containers
      const mainEl = document.querySelector('main')
      if (mainEl) {
        mainEl.scrollTop = 0
      }

      // 5. Any element with overflow-y-auto or overflow-auto or custom scroll
      const scrollables = document.querySelectorAll<HTMLElement>(
        '[class*="overflow-y-auto"], [class*="overflow-auto"], main, #root',
      )
      scrollables.forEach((el) => {
        el.scrollTop = 0
      })
    }

    // Run immediately
    resetScroll()

    // Run after paint / DOM commit in case async components or canvas render late
    const rafId = requestAnimationFrame(() => {
      resetScroll()
    })
    const timer = setTimeout(resetScroll, 60)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(timer)
    }
  }, [pathname, search])

  return null
}
