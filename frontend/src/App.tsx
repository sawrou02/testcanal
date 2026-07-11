import { RouterProvider } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { router } from './router'
import { useThemeStore } from './hooks/useTheme'
import { getRegion } from './lib/api'
import { applyRegion } from './lib/locale'

export default function App() {
  const { theme } = useThemeStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Charge devise + langue avant le premier rendu (réglages régionaux, public).
  useEffect(() => {
    getRegion()
      .then(applyRegion)
      .catch(() => undefined)
      .finally(() => setReady(true))
  }, [])

  if (!ready) return null

  return <RouterProvider router={router} />
}
