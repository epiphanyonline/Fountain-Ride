'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Account = 'driver' | 'rider' | 'guest'
type NavItem = { label: string; href: string }

const customerLinks: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Hire a Driver', href: '/hire-driver' },
  { label: 'Hire a Car', href: '/cars' },
  { label: 'My Bookings', href: '/rider' },
]

const customerAccountLinks: NavItem[] = [
  ...customerLinks,
  { label: 'My Profile', href: '/rider/profile' },
]

const driverLinks: NavItem[] = [
  { label: 'Dashboard & Jobs', href: '/driver' },
  { label: 'My Trips', href: '/driver/trips' },
  { label: 'Wallet', href: '/driver/wallet' },
  { label: 'Driver Profile', href: '/driver/profile' },
]

/**
 * Navigation is selected by the PAGE, not by the previously logged-in role.
 * A customer visiting the main website never sees driver account controls.
 * Driver and rider tokens can coexist without switching identities or signing
 * the other account out. Server APIs still validate their own separate tokens.
 */
export default function MarketplaceNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [account, setAccount] = useState<Account>('guest')
  const [driverTrip, setDriverTrip] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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

  const driverSurface =
    driverHost ||
    pathname === '/driver' ||
    pathname.startsWith('/driver/') ||
    driverTrip

  useEffect(() => {
    const hasDriverSession = Boolean(
      localStorage.getItem('fountain_driver_application_id') &&
      localStorage.getItem('fountain_driver_token')
    )
    const hasRiderSession = Boolean(
      localStorage.getItem('fountain_rider_account_id') &&
      localStorage.getItem('fountain_rider_token')
    )

    setAccount(
      driverSurface
        ? (hasDriverSession ? 'driver' : 'guest')
        : (hasRiderSession ? 'rider' : 'guest')
    )
    setMenuOpen(false)
  }, [pathname, driverSurface])

  function signOut() {
    if (driverSurface) {
      localStorage.removeItem('fountain_driver_application_id')
      localStorage.removeItem('fountain_driver_token')
    } else {
      localStorage.removeItem('fountain_rider_account_id')
      localStorage.removeItem('fountain_rider_token')
    }
    // The old shared role selector no longer controls the active experience.
    localStorage.removeItem('fountain_account_role')
    setAccount('guest')
    setMenuOpen(false)
    router.push(driverSurface ? '/driver/login' : '/')
    router.refresh()
  }

  const links = driverSurface
    ? driverLinks
    : account === 'rider'
      ? customerAccountLinks
      : customerLinks

  const active = (href: string) =>
    href === '/' || href === '/driver'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/')

  const linkClass = (href: string) =>
    'rounded-xl px-3 py-2 text-sm font-semibold transition ' +
    (active(href)
      ? 'bg-purple-100 text-purple-800'
      : 'text-slate-700 hover:bg-purple-50 hover:text-purple-800')

  const loginUrl = driverSurface ? '/driver/login' : '/rider/login'
  const loginLabel = driverSurface ? 'Driver Sign In' : 'Customer Sign In'
  const headingUrl = driverSurface ? '/driver' : '/'

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <Link href={headingUrl} className="flex min-w-0 flex-col">
          <span className="text-lg font-black tracking-tight text-purple-800 sm:text-xl">
            {driverSurface ? 'Fountain Ride Driver' : 'Fountain Ride'}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
            {driverSurface ? 'Driver Work Centre' : 'Mobile Garage'}
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden flex-wrap items-center justify-end gap-1 lg:flex">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
          {account === 'guest' ? (
            <Link href={loginUrl}
              className="rounded-xl bg-purple-700 px-4 py-2 text-sm font-bold text-white hover:bg-purple-600">
              {loginLabel}
            </Link>
          ) : (
            <button type="button" onClick={signOut}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Sign Out
            </button>
          )}
        </nav>

        <button type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="fountain-mobile-menu"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-purple-800 lg:hidden">
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {menuOpen && (
        <nav id="fountain-mobile-menu" aria-label="Mobile navigation"
          className="border-t border-slate-200 bg-white px-5 pb-5 pt-3 lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                className={linkClass(item.href)}>
                {item.label}
              </Link>
            ))}
            {account === 'guest' ? (
              <Link href={loginUrl} onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-xl bg-purple-700 px-4 py-3 text-center text-sm font-bold text-white">
                {loginLabel}
              </Link>
            ) : (
              <button type="button" onClick={signOut}
                className="mt-2 rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-700">
                Sign Out
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
