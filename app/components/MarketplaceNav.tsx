'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Role = 'driver' | 'rider' | 'guest'

type NavItem = {
  label: string
  href: string
}

const guestLinks: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Hire a Driver', href: '/hire-driver' },
  { label: 'Hire a Car', href: '/cars' },
  { label: 'List Your Car', href: '/list-your-car' },
  { label: 'Owner Earnings', href: '/owner-earnings' },
]

const riderLinks: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Hire a Driver', href: '/hire-driver' },
  { label: 'Hire a Car', href: '/cars' },
  { label: 'My Bookings', href: '/rider' },
  { label: 'Profile', href: '/rider/profile' },
]

const driverLinks: NavItem[] = [
  { label: 'Dashboard', href: '/driver' },
  { label: 'Hire Jobs', href: '/driver' },
  { label: 'Trips', href: '/driver/trips' },
  { label: 'Wallet', href: '/driver/wallet' },
  { label: 'Profile', href: '/driver/profile' },
]

export default function MarketplaceNav() {
  const pathname = usePathname()
  const router = useRouter()

  const [role, setRole] = useState<Role>('guest')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const driver = Boolean(
      localStorage.getItem('fountain_driver_application_id') &&
      localStorage.getItem('fountain_driver_token')
    )

    const rider = Boolean(
      localStorage.getItem('fountain_rider_account_id') &&
      localStorage.getItem('fountain_rider_token')
    )

    const preferred = localStorage.getItem('fountain_account_role')

    if (driver && (preferred === 'driver' || !rider)) {
      setRole('driver')
    } else if (rider) {
      setRole('rider')
    } else {
      setRole('guest')
    }

    setMenuOpen(false)
  }, [pathname])

  function signOut() {
    if (role === 'driver') {
      localStorage.removeItem('fountain_driver_application_id')
      localStorage.removeItem('fountain_driver_token')
    }

    if (role === 'rider') {
      localStorage.removeItem('fountain_rider_account_id')
      localStorage.removeItem('fountain_rider_token')
    }

    localStorage.removeItem('fountain_account_role')
    setRole('guest')
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const links =
    role === 'driver'
      ? driverLinks
      : role === 'rider'
        ? riderLinks
        : guestLinks

  const active = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(`${href}/`)

  const linkClass = (href: string) =>
    `rounded-xl px-3 py-2 text-sm font-semibold transition ${
      active(href)
        ? 'bg-purple-100 text-purple-800'
        : 'text-slate-700 hover:bg-purple-50 hover:text-purple-800'
    }`

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <Link
          href={role === 'driver' ? '/driver' : '/'}
          className="flex min-w-0 flex-col"
        >
          <span className="text-lg font-black tracking-tight text-purple-800 sm:text-xl">
            Fountain Ride
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">
            Mobile Garage
            {role === 'driver' ? ' | Driver' : ''}
          </span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="hidden flex-wrap items-center justify-end gap-1 lg:flex"
        >
          {links.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={linkClass(item.href)}
            >
              {item.label}
            </Link>
          ))}

          {role === 'guest' ? (
            <>
              <Link
                href="/rider/login"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-purple-50"
              >
                Customer Sign In
              </Link>
              <Link
                href="/driver/login"
                className="rounded-xl bg-purple-700 px-4 py-2 text-sm font-bold text-white hover:bg-purple-600"
              >
                Driver Sign In
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Sign Out
            </button>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="fountain-mobile-menu"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-purple-800 lg:hidden"
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {menuOpen && (
        <nav
          id="fountain-mobile-menu"
          aria-label="Mobile navigation"
          className="border-t border-slate-200 bg-white px-5 pb-5 pt-3 lg:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={linkClass(item.href)}
              >
                {item.label}
              </Link>
            ))}

            {role === 'guest' ? (
              <>
                <Link
                  href="/rider/login"
                  onClick={() => setMenuOpen(false)}
                  className={linkClass('/rider/login')}
                >
                  Customer Sign In
                </Link>
                <Link
                  href="/driver/login"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 rounded-xl bg-purple-700 px-4 py-3 text-center text-sm font-bold text-white"
                >
                  Driver Sign In
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={signOut}
                className="mt-2 rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-700"
              >
                Sign Out
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
