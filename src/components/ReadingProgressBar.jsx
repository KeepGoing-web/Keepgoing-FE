import { useState, useEffect } from 'react'
import './ReadingProgressBar.css'

/**
 * A thin progress bar fixed at the top of the viewport (below header),
 * indicating how far the user has scrolled through the page.
 * @param {HTMLElement|null} [containerRef] — scroll container (defaults to vault-main)
 */
const ReadingProgressBar = () => {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const container = document.querySelector('.vault-main') || document.documentElement

    const handleScroll = () => {
      const el = container === document.documentElement ? document.documentElement : container
      const scrollTop = el.scrollTop
      const scrollHeight = el.scrollHeight - el.clientHeight
      if (scrollHeight <= 0) { setProgress(0); return }
      setProgress(Math.min(100, (scrollTop / scrollHeight) * 100))
    }

    const target = container === document.documentElement ? window : container
    target.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => target.removeEventListener('scroll', handleScroll)
  }, [])

  if (progress <= 0) return null

  return (
    <div className="reading-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
      <div className="reading-progress-bar" style={{ width: `${progress}%` }} />
    </div>
  )
}

export default ReadingProgressBar
