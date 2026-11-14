import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Fountain Ride Driver',
    template: '%s | Fountain Ride Driver',
  },
  description:
    'Fountain Ride Driver work centre. Manage driver jobs, availability, trips, profile and wallet.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/driver-icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    shortcut: '/driver-icon.svg',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fountain Ride Driver',
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
