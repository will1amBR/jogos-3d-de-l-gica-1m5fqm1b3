import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop - Garante que ao mudar de rota ou carregar a página,
 * o scroll da janela e do contêiner principal seja sempre levado para o topo (topup).
 */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Scroll window to top instantly
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    })

    // Also reset scroll for document element and body
    if (document.documentElement) {
      document.documentElement.scrollTop = 0
    }
    if (document.body) {
      document.body.scrollTop = 0
    }

    // Reset any main scrolling containers
    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.scrollTop = 0
    }
  }, [pathname])

  return null
}
