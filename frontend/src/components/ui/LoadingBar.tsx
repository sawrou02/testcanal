import { useEffect, useRef, useState } from 'react'
import { onLoadingChange } from '../../lib/api'

/**
 * Barre de progression fine en haut de l'écran (style YouTube/GitHub).
 * Elle avance pendant que des requêtes sont en cours, puis se complète à 100 %
 * et disparaît. Remplace avantageusement les messages d'erreur transitoires :
 * l'utilisateur voit « ça charge » au lieu d'une erreur.
 */
export function LoadingBar() {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef<number>()

  useEffect(() => {
    return onLoadingChange((active) => {
      if (active > 0) {
        window.clearTimeout(hideTimer.current)
        setVisible(true)
        setProgress((p) => (p < 8 ? 8 : p))
      } else {
        // Plus aucune requête → on complète puis on masque.
        setProgress(100)
        hideTimer.current = window.setTimeout(() => {
          setVisible(false)
          setProgress(0)
        }, 350)
      }
    })
  }, [])

  // Progression douce vers 90 % tant que ça charge.
  useEffect(() => {
    if (!visible) return
    const id = window.setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.max(0.6, (90 - p) * 0.08)))
    }, 200)
    return () => window.clearInterval(id)
  }, [visible])

  if (!visible && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[3px] pointer-events-none">
      <div
        className="h-full"
        style={{
          width: `${progress}%`,
          background: 'var(--primary)',
          boxShadow: '0 0 8px var(--primary)',
          opacity: visible ? 1 : 0,
          transition: 'width 0.2s ease, opacity 0.3s ease',
        }}
      />
    </div>
  )
}
