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
      href: '/admin/bookings',
      emoji: '📅',
      title: 'Bookings',
      description:
        'Review pending requests, confirm hires, reject bookings and manage rental operations.',
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
      title: 'Live Chat',
      description:
        'Respond to customer enquiries in real time with FAQ replies and WhatsApp escalation.',
      button: 'Open Inbox',
      color: 'bg-green-600',
    },
    {
      href: '/admin/car-owner-applications',
      emoji: '🤝',
      title: 'Owner Applications',
      description:
        'Review partner vehicle submissions, route pricing and approve hidden listings.',
      button: 'Review Applications',
      color: 'bg-purple-700',
    },
    {
      href: '/admin/routes',
      emoji: '🛣️',
      title: 'Routes & Pricing',
      description:
        'Manage city-to-city routes, package types and WhatsApp pricing requests.',
      button: 'Manage Routes',
      color: 'bg-purple-700',
    },
    {
      href: '/admin/site',
      emoji: '🖼️',
      title: 'Homepage Editor',
      description:
        'Update homepage content, hero sections, WhatsApp text and branding.',
      button: 'Edit Website',
      color: 'bg-purple-700',
    },
    {
      href: '/',
      emoji: '🌍',
      title: 'Public Website',
      description:
        'Open the live customer-facing Fountain Ride website.',
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
                Manage bookings, customer conversations, partner vehicle listings,
                routes, pricing and daily operations from one dashboard.
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
              <Link key={card.title} href={card.href}>
                <div className="bg-white rounded-[2rem] shadow-sm border p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer h-full flex flex-col">
                  <div className="text-5xl mb-5">{card.emoji}</div>

                  <h2 className="text-2xl font-black">
                    {card.title}
                  </h2>

                  <p className="text-gray-600 mt-3 leading-relaxed flex-1">
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