'use client'

import { useEffect, useState } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('install_prompt_dismissed')

    if (dismissed === 'true') return

    function handler(e: any) {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  async function installApp() {
    if (!deferredPrompt) return

    deferredPrompt.prompt()

    const choiceResult = await deferredPrompt.userChoice

    if (choiceResult.outcome === 'accepted') {
      setShowPrompt(false)
    }
  }

  function dismissPrompt() {
    localStorage.setItem('install_prompt_dismissed', 'true')
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl border p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-purple-700">
              Install Fountain Ride
            </p>

            <h3 className="text-xl font-black mt-1">
              Book rides faster
            </h3>

            <p className="text-sm text-gray-500 mt-2">
              Add Fountain Ride to your phone home screen for faster booking and quick access.
            </p>
          </div>

          <button
            onClick={dismissPrompt}
            className="text-gray-400 hover:text-black text-lg"
          >
            ✕
          </button>
        </div>

        <button
          onClick={installApp}
          className="mt-5 w-full bg-purple-700 hover:bg-purple-800 text-white py-3 rounded-2xl font-bold"
        >
          Install App
        </button>
      </div>
    </div>
  )
}