import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import InstallPrompt from './components/InstallPrompt'
import LiveChat from './components/LiveChat'
import MobileBottomNav from './components/MobileBottomNav'
import PwaRegister from './components/PwaRegister'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fountain Ride',
  description: 'Pre-book private rides, enter Fountain Ride Mobile Garage™, negotiate fares and follow your driver across Nigeria.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Fountain Ride' },
  icons: {
    icon: [{ url: '/fountain-ride-mark.svg?v=20261113', type: 'image/svg+xml', sizes: 'any' }],
    shortcut: '/fountain-ride-mark.svg?v=20261113',
    apple: '/icon-192.png',
  },
}
export const viewport: Viewport = { themeColor:'#6d28d9', width:'device-width', initialScale:1, viewportFit:'cover' }

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}><body className="min-h-full flex flex-col pb-20 md:pb-0"><PwaRegister/>{children}<LiveChat/><InstallPrompt/><MobileBottomNav/><Analytics/><SpeedInsights/></body></html>
}
