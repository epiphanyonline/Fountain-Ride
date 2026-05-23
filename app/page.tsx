import Link from 'next/link'
import FaqBot from './components/FaqBot'

export default function HomePage() {
  const whatsappNumber = '2348168839382'

  const whatsappText = encodeURIComponent(
    'Hello, I need a reliable car with driver for my next trip. Please assist me with booking.'
  )

  const airportText = encodeURIComponent(
    'Hello, I need airport pickup. My airport is: , arrival date/time: , destination: , passengers: '
  )

  return (
    <main className="min-h-screen bg-[#f7f4fb] text-gray-950">
      {/* HERO */}
      <section className="max-w-7xl mx-auto px-5 py-6 md:py-12">
        <div className="rounded-[2rem] bg-white shadow-sm border overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="p-6 md:p-12 flex flex-col justify-center">
              <p className="text-sm font-bold text-purple-700">
                Careful drivers. Professional service. No overspeeding.
              </p>

              <p className="text-xs mt-2 text-gray-500 font-semibold">
                Powered by Epiphany Ride · Fountain Ride
              </p>

              <h1 className="text-4xl md:text-6xl font-black mt-4 leading-tight">
                Need a reliable car for your next trip?
              </h1>

              <p className="text-gray-600 mt-5 text-base md:text-lg leading-relaxed">
                Book clean, decent cars with experienced drivers who know the routes —
                ideal for airport pickup, city rides, city-to-city travel, business trips,
                and picking up loved ones.
              </p>

              <p className="mt-4 font-semibold text-gray-800">
                Safe. Comfortable. On time.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Link href="/cars" className="w-full sm:w-auto">
                  <button className="w-full bg-purple-700 hover:bg-purple-800 text-white px-7 py-4 rounded-2xl font-bold shadow">
                    View Available Cars
                  </button>
                </Link>

                <a
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
                  target="_blank"
                  className="w-full sm:w-auto"
                >
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white px-7 py-4 rounded-2xl font-bold shadow">
                    Chat on WhatsApp
                  </button>
                </a>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
                {[
                  ['Airport Pickup', 'Arrival & drop-off'],
                  ['City to City', 'Major routes'],
                  ['Business Trips', 'Professional service'],
                  ['Daily Hire', '8am – 8pm'],
                ].map(([title, text]) => (
                  <div key={title} className="bg-[#f7f4fb] rounded-2xl p-4 border">
                    <p className="font-black text-sm">{title}</p>
                    <p className="text-xs text-gray-500 mt-1">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative min-h-[420px] md:min-h-[580px]">
              <img
                src="https://mssizgzdewgutcmqdsim.supabase.co/storage/v1/object/public/images/Fountain%20Ride.png"
                alt="Fountain Ride airport pickup"
                className="absolute inset-0 w-full h-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              <div className="absolute top-4 right-4 md:top-5 md:right-5 bg-purple-800 text-white px-4 py-3 md:p-5 rounded-2xl shadow-lg max-w-[180px] md:max-w-[220px]">
                <p className="font-bold text-base md:text-lg leading-tight">
                  Careful. Professional.
                </p>

                <p className="text-xs md:text-sm mt-1 text-purple-100">
                  We never overspeed.
                </p>
              </div>

              <div className="absolute bottom-4 left-4 right-4 md:bottom-5 md:left-5 md:right-5 bg-white/95 backdrop-blur rounded-2xl md:rounded-3xl p-4 md:p-5 shadow">
                <p className="text-sm font-bold text-purple-700">
                  Daily Hire: 8am – 8pm
                </p>

                <p className="text-2xl md:text-xl font-black mt-1 leading-tight">
                  Need more time?
                </p>

                <p className="text-base md:text-lg font-semibold text-gray-700 mt-1">
                  Extended hours available.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="max-w-7xl mx-auto px-5 pb-8">
        <div className="grid md:grid-cols-5 gap-4">
          {[
            ['✈️', 'Airport Pickup', 'On-time arrival and drop-off'],
            ['🏙️', 'City Travel', 'Move easily within cities'],
            ['🚗', 'City to City', 'Comfortable long trips'],
            ['👨‍👩‍👧', 'Family Trips', 'Pick up loved ones safely'],
            ['💼', 'Business Travel', 'Professional service'],
          ].map(([icon, title, text]) => (
            <div key={title} className="bg-white rounded-3xl p-5 border shadow-sm">
              <p className="text-2xl">{icon}</p>
              <p className="font-black mt-3">{title}</p>
              <p className="text-sm text-gray-500 mt-2">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="max-w-7xl mx-auto px-5 pb-8">
        <div className="bg-purple-800 rounded-[2rem] p-6 text-white grid md:grid-cols-4 gap-4">
          {[
            ['Careful Drivers', 'We prioritize your safety always'],
            ['Clean Cars', 'Well-maintained vehicles'],
            ['On Time', 'We respect your schedule'],
            ['Support', 'We’re available when needed'],
          ].map(([title, text]) => (
            <div key={title} className="border-white/10 md:border-r last:border-r-0">
              <p className="font-black">{title}</p>
              <p className="text-sm text-purple-100 mt-1">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SUBTLE OWNER LISTING */}
      <section className="max-w-7xl mx-auto px-5 pb-8">
        <div className="bg-white rounded-[2rem] border shadow-sm p-5 md:p-7">
          <div className="grid md:grid-cols-[1fr_auto] gap-5 items-center">
            <div>
              <p className="text-sm font-bold text-purple-700">
                Partner with Fountain Ride
              </p>

              <h2 className="text-2xl md:text-3xl font-black mt-2">
                Would you like to turn your car into an income-generating asset?
              </h2>

              <p className="text-gray-600 mt-3 leading-relaxed">
                Verified car owners can submit their vehicle details for review.
                Approved cars may be listed under Fountain Ride’s managed service.
              </p>
            </div>

            <Link href="/list-your-car">
              <button className="w-full md:w-auto bg-gray-950 hover:bg-black text-white px-7 py-4 rounded-2xl font-bold">
                Submit Car Details
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* AIRPORT BOOKING */}
      <section className="max-w-7xl mx-auto px-5 pb-8">
        <div className="bg-white rounded-[2rem] shadow-sm border p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <p className="text-sm font-bold text-purple-700">
                Quick Airport Pickup
              </p>

              <h2 className="text-3xl font-black mt-2">
                Arriving in Lagos, Abuja or Ibadan?
              </h2>

              <p className="text-gray-600 mt-3">
                Tell us your arrival details and we’ll arrange a driver ahead of time.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <a href={`https://wa.me/${whatsappNumber}?text=${airportText}`} target="_blank">
                <button className="w-full bg-purple-700 text-white py-4 rounded-2xl font-bold">
                  Book Airport Pickup
                </button>
              </a>

              <Link href="/cars">
                <button className="w-full bg-gray-950 text-white py-4 rounded-2xl font-bold">
                  Choose a Car First
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-5 pb-14">
        <div className="grid md:grid-cols-4 gap-4">
          {[
            ['1. View cars', 'Browse and choose a vehicle'],
            ['2. Pick dates', 'Select your trip period'],
            ['3. Send request', 'Submit your details'],
            ['4. Get confirmed', 'We prepare your ride'],
          ].map(([title, text]) => (
            <div key={title} className="bg-white rounded-3xl p-6 shadow-sm border">
              <p className="font-black">{title}</p>
              <p className="text-gray-500 text-sm mt-2">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-7xl mx-auto px-5 pb-16">
        <div className="bg-gray-950 rounded-[2rem] p-8 text-white">
          <h2 className="text-2xl md:text-4xl font-black">
            Wherever you’re going, we’ll get you there safely.
          </h2>

          <p className="text-gray-300 mt-3">
            Office: 100, Adekunle Fajuyi Road, Adamasingba, Ibadan.
          </p>

          <p className="text-gray-300 mt-1">
            WhatsApp: +234 816 883 9382
          </p>

          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
            target="_blank"
          >
            <button className="mt-6 bg-white text-gray-950 px-8 py-4 rounded-2xl font-bold">
              Chat on WhatsApp
            </button>
          </a>
        </div>
      </section>

      <FaqBot />
    </main>
  )
}