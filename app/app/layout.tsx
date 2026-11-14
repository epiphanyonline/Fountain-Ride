import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fountain Ride — Book a Driver or Car',
  description: 'Hire a professional driver for your own car, or book a car with a driver. Fountain Ride Mobile Garage.',
  manifest: '/rider-app-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fountain Ride',
  },
}

export default function RiderAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
