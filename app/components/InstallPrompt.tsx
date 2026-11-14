'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

type InstallChoice = { outcome: 'accepted' | 'dismissed' }
type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<InstallChoice>
}

export default function InstallPrompt() {
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<InstallEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [driverHost, setDriverHost] = useState(false)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    setDriverHost(window.location.hostname.toLowerCase() === 'drivers.fountainride.com')

    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const updateMobile = () => setMobile(mediaQuery.matches)
    updateMobile()
    mediaQuery.addEventListener('change', updateMobile)

    const dismissed = localStorage.getItem('install_prompt_dismissed') === 'true'
    if (dismissed) {
      return () => mediaQuery.removeEventListener('change', updateMobile)
    }

    function handler(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as InstallEvent)
      setShowPrompt(true)
    }

    function installed() {
      setShowPrompt(false)
      setDeferredPrompt(null)
      localStorage.setItem('install_prompt_dismissed', 'true')
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installed)

    return () => {
      mediaQuery.removeEventListener('change', updateMobile)
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  async function installApp() {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === 'accepted') {
        localStorage.setItem('install_prompt_dismissed', 'true')
      }
    } finally {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  function dismissPrompt() {
    localStorage.setItem('install_prompt_dismissed', 'true')
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  // Keep account creation and sign-in forms clear. Offer installation only
  // on the relevant home/dashboard and only on small mobile screens.
  const eligiblePage = driverHost ? pathname === '/driver' : pathname === '/'
  if (!mobile || !eligiblePage || !showPrompt || !deferredPrompt) return null

  return (
    <aside aria-label="Install Fountain Ride app"
      className="fixed bottom-24 left-3 right-3 z-40 mx-auto max-w-sm rounded-2xl border border-purple-100 bg-white p-4 shadow-xl md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-purple-800">
            {driverHost ? 'Fountain Ride Driver' : 'Fountain Ride'}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {driverHost
              ? 'Add your driver dashboard to your home screen.'
              : 'Add faster bookings to your home screen.'}
          </p>
        </div>
        <button type="button" onClick={dismissPrompt}
          aria-label="Dismiss install suggestion"
          className="rounded-lg px-2 py-1 text-lg text-slate-500 hover:bg-slate-100">
          ×
        </button>
      </div>
      <button type="button" onClick={() => void installApp()}
        className="mt-3 w-full rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-800">
        Install App
      </button>
    </aside>
  )
}
