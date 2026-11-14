'use client'

import { useEffect } from 'react'

/**
 * Keep the Rider application home distinct from the marketing home during
 * the current browsing session. This stores no account, driver or booking data.
 */
export default function RiderAppEntry() {
  useEffect(() => {
    try {
      window.sessionStorage.setItem('fountain_rider_app_session', '1')
    } catch {
      // The two booking actions work even if storage is unavailable.
    }
  }, [])

  return null
}
