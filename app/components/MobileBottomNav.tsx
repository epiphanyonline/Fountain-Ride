'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

function isDriverPage(pathname: string) {
  return pathname === '/driver' || pathname.startsWith('/driver/')
}

const riderItems = [
  { href: '/', icon: '⌂', label: 'Home' },
  { href: '/hire-driver', icon: '＋', label: 'Hire Driver' },
  { href: '/cars', icon: '🚗', label: 'Hire Car' },
  { href: '/rider', icon: '◫', label: 'My Bookings' },
]

const driverItems = [
  { href: '/driver', icon: '⌂', label: 'Dashboard' },
  { href: '/driver/trips', icon: '◫', label: 'Trips' },
  { href: '/driver/wallet', icon: '₦', label: 'Wallet' },
  { href: '/driver/profile', icon: '◉', label: 'Profile' },
]

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [driverTrip, setDriverTrip] = useState(false)

  const [driverHost, setDriverHost] = useState(false)

  useEffect(() => {
    setDriverHost(window.location.hostname.toLowerCase() === 'drivers.fountainride.com')
  }, [pathname])

  useEffect(() => {
    setDriverTrip(
      pathname.startsWith('/trips/') &&
      new URLSearchParams(window.location.search).get('as') === 'driver'
    )
  }, [pathname])

  const driverPage = driverHost || isDriverPage(pathname) || driverTrip
  const items = driverPage ? driverItems : riderItems

  return (
    <nav aria-label={driverPage ? 'Driver navigation' : 'Customer navigation'}
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur px-2 py-2 pb-[max(.5rem,env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/' && item.href !== '/driver' &&
              pathname.startsWith(item.href + '/'))
          return (
            <Link href={item.href} key={item.href}
              className={'rounded-xl py-2 text-center text-[11px] font-black ' +
                (active ? 'bg-purple-50 text-purple-800' : 'text-gray-500')}>
              <span className="block text-lg leading-none mb-1" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
