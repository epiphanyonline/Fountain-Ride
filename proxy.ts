import { NextResponse, type NextRequest } from 'next/server'

/**
 * Fountain Ride's Driver portal shares the existing Next.js backend while
 * presenting an independent web origin: drivers.fountainride.com.
 *
 * This is a routing boundary, NOT an authorization mechanism. Every API must
 * still validate its own customer/driver/admin credentials server-side.
 *
 * Keep legacy /driver links on fountainride.com for the migration period.
 * Those existing URLs can only be retired after driver onboarding and account
 * recovery have been tested on the new hostname.
 */
const DRIVER_HOST = 'drivers.fountainride.com'
const CUSTOMER_ORIGIN = 'https://fountainride.com'

function matchesPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(prefix + '/')
}

export function proxy(request: NextRequest) {
  // Only this exact configured hostname gets Driver-specific routing.
  if (request.nextUrl.hostname.toLowerCase() !== DRIVER_HOST) {
    return NextResponse.next()
  }

  const pathname = request.nextUrl.pathname

  if (pathname === '/') {
    // Preserve the URL origin; driver sessions must stay on the Driver host.
    return NextResponse.redirect(new URL('/driver', request.url))
  }

  // Same manifest URL, different PWA identity on the Driver origin.
  if (pathname === '/manifest.json') {
    return NextResponse.rewrite(new URL('/driver-manifest.json', request.url))
  }

  // Never expose admin pages or the admin API surface on the Driver host.
  // Admin authorization must also be enforced within each API route.
  if (matchesPrefix(pathname, '/admin') ||
      matchesPrefix(pathname, '/api/admin')) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  // Customer-facing pages live on the flagship Fountain Ride website.
  const customerPages = [
    '/rider',
    '/hire-driver',
    '/cars',
    '/vehicle-hire',
    '/book',
    '/list-your-car',
    '/owner-earnings',
  ]

  if (customerPages.some((path) => matchesPrefix(pathname, path)) ||
      (matchesPrefix(pathname, '/trips') &&
        request.nextUrl.searchParams.get('as') !== 'driver')) {
    const target = new URL(request.nextUrl.pathname + request.nextUrl.search, CUSTOMER_ORIGIN)
    return NextResponse.redirect(target)
  }

  // Customer session endpoints are not offered on the Driver origin.
  if (matchesPrefix(pathname, '/api/marketplace/rider') ||
      matchesPrefix(pathname, '/api/marketplace/vehicle-hire')) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
