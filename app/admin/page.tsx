'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminGuard from '../components/AdminGuard'

export default function AdminDashboardPage() {
  const router = useRouter()

  function logout() {
    localStorage.removeItem('fountain_admin_logged_in')
    router.push('/admin/login')
  }

  const cards = [

    {
      href: '/admin/driver-hire',
      emoji: '\u{1F464}',
      title: 'Driver Hire Operations',
      description:
        'Monitor driver requests, quotations, accepted offers, payments, booking progress, commissions and earnings.',
      button: 'Manage Driver Hire',
    },


    {
      href: '/admin/driver-hire/bank-transfers',
      emoji: '\u{1F4B3}',
      title: 'Driver Hire Payments',
      description:
        'Review reported bank transfers, verify received payments, and confirm Driver Hire bookings.',
      button: 'Verify Driver Payments',
    },
    {
      href: '/admin/vehicle-hire/bank-transfers',
      emoji: '\u{1F3E6}',
      title: 'Vehicle Hire Payments',
      description:
        'Review customer bank transfers, verify actual credits, and confirm Vehicle Hire bookings.',
      button: 'Verify Vehicle Payments',
    },

    {
      href: '/admin/marketplace',
      emoji: '🚕',
      title: 'Driver–Rider Operations',
      description:
        'Monitor ride requests, driver offers, fare negotiations, payments, active trips, driver wallets, cashouts and disputes.',
      button: 'Open Operations',
      color: 'bg-green-600',
      
      featured: true,
    },
    {
      href: '/admin/vehicle-hire',
      emoji: '\u{1F697}',
      title: 'Vehicle Hire Requests',
      description:
        'Monitor vehicle hire requests, review quotations, manage customer bookings and track payment status.',
      button: 'Manage Vehicle Hires',
      color: 'bg-purple-700',
    },
    {
      href: '/admin/bookings',

      emoji: '📅',
      title: 'Car Hire Bookings',
      description:
        'Review traditional car-hire requests, confirm hires, reject bookings and manage rental operations.',
      button: 'Manage Bookings',
      color: 'bg-purple-700',
    },
    {
      href: '/admin/cars',
      emoji: '🚗',
      title: 'Fleet',
      description:
        'Add vehicles, manage availability, pricing, images and listing visibility.',
      button: 'Manage Fleet',
      color: 'bg-purple-700',
    },
    {
      href: '/admin/chat',
      emoji: '💬',
      title: 'Customer Support',
      description:
        'Respond to customer enquiries and manage support conversations and escalations.',
      button: 'Open Inbox',
      color: 'bg-green-600',
    },
    {
      href: '/admin/car-owner-applications',
      emoji: '🤝',
      title: 'Owner Applications',
      description:
        'Review vehicle-owner applications and manage partner vehicle onboarding.',
      button: 'Review Applications',
      color: 'bg-purple-700',
    },
    {
      href: '/admin/routes',
      emoji: '🛣️',
      title: 'Routes & Pricing',
      description:
        'Manage city-to-city routes, package types and route pricing.',
      button: 'Manage Routes',
      color: 'bg-purple-700',
    },
    {
      href: '/admin/site',
      emoji: '🖼️',
      title: 'Homepage Editor',
      description:
        'Update homepage content, hero sections, support text and branding.',
      button: 'Edit Website',
      color: 'bg-purple-700',
    },
    {
      href: '/',
      emoji: '🌍',
      title: 'Public Website',
      description:
        'Open the customer-facing Fountain Ride website.',
      button: 'View Website',
      color: 'bg-gray-900',
    },
  ]

  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#f7f4fb] px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-purple-700">
                Fountain Ride Admin
              </p>

              <h1 className="text-3xl md:text-5xl font-black mt-2">
                Operations Control Centre
              </h1>

              <p className="text-gray-600 mt-3 max-w-3xl">
                Control Fountain Ride marketplace operations, car hire,
                drivers, payments, cashouts, customer support and fleet
                management from one dashboard.
              </p>
            </div>

            <button
              onClick={logout}
              className="bg-gray-950 hover:bg-black text-white px-6 py-4 rounded-2xl font-bold w-full sm:w-auto"
            >
              Logout
            </button>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {cards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className={card.featured ? 'sm:col-span-2 xl:col-span-2' : ''}
              >
                <div
                  className={`rounded-[2rem] border p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer h-full flex flex-col ${
                    card.featured
                      ? 'bg-gray-950 text-white border-gray-950'
                      : 'bg-white shadow-sm'
                  }`}
                >
                  <div className="text-5xl mb-5">{card.emoji}</div>

                  {card.featured && (
                    <p className="text-xs font-black tracking-wider text-purple-300 mb-2">
                      LIVE MARKETPLACE
                    </p>
                  )}

                  <h2 className="text-2xl font-black">
                    {card.title}
                  </h2>

                  <p
                    className={`mt-3 leading-relaxed flex-1 ${
                      card.featured ? 'text-gray-300' : 'text-gray-600'
                    }`}
                  >
                    {card.description}
                  </p>

                  <button
                    className={`mt-6 ${card.color} text-white px-5 py-4 rounded-2xl font-bold w-full`}
                  >
                    {card.button}
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </AdminGuard>
  )
}
