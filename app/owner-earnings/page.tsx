'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type DriverOption = 'owner_driver' | 'fountain_driver'

export default function OwnerEarningsPage() {
  const [carName, setCarName] = useState('Toyota Sienna')
  const [year, setYear] = useState('2012')
  const [driverOption, setDriverOption] = useState<DriverOption>('owner_driver')

  const [cityPrice, setCityPrice] = useState('160000')
  const [airportPrice, setAirportPrice] = useState('100000')
  const [interstateMin, setInterstateMin] = useState('200000')
  const [interstateMax, setInterstateMax] = useState('500000')

  const commissionRate = driverOption === 'fountain_driver' ? 0.3 : 0.2

  const formatNaira = (value: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(value)

  const calculate = (price: number) => {
    const commission = price * commissionRate
    const ownerTakeHome = price - commission

    return {
      commission,
      ownerTakeHome,
    }
  }

  const result = useMemo(() => {
    const city = Number(cityPrice || 0)
    const airport = Number(airportPrice || 0)
    const interstateLow = Number(interstateMin || 0)
    const interstateHigh = Number(interstateMax || 0)

    return {
      city,
      airport,
      interstateLow,
      interstateHigh,
      cityCalc: calculate(city),
      airportCalc: calculate(airport),
      interstateLowCalc: calculate(interstateLow),
      interstateHighCalc: calculate(interstateHigh),
    }
  }, [cityPrice, airportPrice, interstateMin, interstateMax, driverOption])

  const whatsappText = encodeURIComponent(
    `Hello Fountain Ride, I would like to list my ${year} ${carName}. I have checked the owner earnings calculator and would like to proceed.`
  )

  return (
    <main className="min-h-screen bg-[#f7f4fb] text-gray-950">
      <section className="max-w-6xl mx-auto px-5 py-6 md:py-12">
        <Link href="/" className="text-sm font-bold text-purple-700">
          ← Back to Home
        </Link>

        <div className="mt-5 rounded-[2rem] bg-white border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-purple-800 to-fuchsia-700 p-6 md:p-10 text-white">
            <p className="text-sm font-bold text-purple-100 uppercase tracking-wide">
              Fountain Ride
            </p>

            <h1 className="mt-3 text-3xl md:text-5xl font-black leading-tight">
              Owner Earnings Calculator
            </h1>

            <p className="mt-4 text-purple-100 max-w-2xl leading-relaxed">
              Estimate your possible take-home when your car is listed for airport pickup,
              city hire, or interstate trips.
            </p>
          </div>

          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6 p-5 md:p-8">
            {/* FORM */}
            <div className="rounded-[1.5rem] bg-[#faf7ff] border p-5 md:p-6">
              <h2 className="text-xl font-black">Car Details</h2>

              <div className="mt-5 grid gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">Car Name / Model</label>
                  <input
                    value={carName}
                    onChange={(e) => setCarName(e.target.value)}
                    className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">Year</label>
                  <input
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">Driver Arrangement</label>
                  <select
                    value={driverOption}
                    onChange={(e) => setDriverOption(e.target.value as DriverOption)}
                    className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-purple-300 bg-white"
                  >
                    <option value="owner_driver">Owner provides driver — 20% commission</option>
                    <option value="fountain_driver">Fountain Ride provides driver — 30% commission</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">Within City Daily Price</label>
                  <input
                    type="number"
                    value={cityPrice}
                    onChange={(e) => setCityPrice(e.target.value)}
                    className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700">Airport Pickup Price</label>
                  <input
                    type="number"
                    value={airportPrice}
                    onChange={(e) => setAirportPrice(e.target.value)}
                    className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold text-gray-700">Interstate Min</label>
                    <input
                      type="number"
                      value={interstateMin}
                      onChange={(e) => setInterstateMin(e.target.value)}
                      className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-gray-700">Interstate Max</label>
                    <input
                      type="number"
                      value={interstateMax}
                      onChange={(e) => setInterstateMax(e.target.value)}
                      className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RESULTS */}
            <div>
              <div className="rounded-[1.5rem] border bg-white p-5 md:p-6 shadow-sm">
                <p className="text-sm font-bold text-purple-700 uppercase tracking-wide">
                  Estimated Breakdown
                </p>

                <h2 className="mt-2 text-2xl md:text-3xl font-black">
                  {year} {carName}
                </h2>

                <p className="mt-2 text-gray-600">
                  Commission rate: <b>{commissionRate * 100}%</b>
                </p>

                <div className="mt-6 grid gap-4">
                  <BreakdownCard
                    title="Within City Daily Hire"
                    customerPays={formatNaira(result.city)}
                    commission={formatNaira(result.cityCalc.commission)}
                    ownerTakeHome={formatNaira(result.cityCalc.ownerTakeHome)}
                  />

                  <BreakdownCard
                    title="Airport Pickup"
                    customerPays={formatNaira(result.airport)}
                    commission={formatNaira(result.airportCalc.commission)}
                    ownerTakeHome={formatNaira(result.airportCalc.ownerTakeHome)}
                  />

                  <BreakdownCard
                    title="Interstate Trips"
                    customerPays={`${formatNaira(result.interstateLow)} – ${formatNaira(
                      result.interstateHigh
                    )}`}
                    commission={`${formatNaira(result.interstateLowCalc.commission)} – ${formatNaira(
                      result.interstateHighCalc.commission
                    )}`}
                    ownerTakeHome={`${formatNaira(result.interstateLowCalc.ownerTakeHome)} – ${formatNaira(
                      result.interstateHighCalc.ownerTakeHome
                    )}`}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] bg-gray-950 p-5 md:p-6 text-white">
                <h3 className="text-xl font-black">Important Notes</h3>

                <div className="mt-4 grid gap-3 text-sm text-gray-300 leading-relaxed">
                  <p>• Daily hire runs from <b className="text-white">8:00 AM – 8:00 PM</b>.</p>
                  <p>• Trips start with a <b className="text-white">full tank</b>.</p>
                  <p>• The package includes fuel usage up to <b className="text-white">half tank only</b>.</p>
                  <p>• Once fuel reaches half tank, the customer tops up fuel.</p>
                  <p>• Interstate pricing depends on destination, distance, waiting time, and trip duration.</p>
                </div>

                <a
                  href={`https://wa.me/2348168839382?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="mt-6 w-full rounded-2xl bg-white px-6 py-4 font-bold text-gray-950">
                    Continue on WhatsApp
                  </button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

function BreakdownCard({
  title,
  customerPays,
  commission,
  ownerTakeHome,
}: {
  title: string
  customerPays: string
  commission: string
  ownerTakeHome: string
}) {
  return (
    <div className="rounded-3xl border bg-[#faf7ff] p-5">
      <h3 className="font-black text-lg">{title}</h3>

      <div className="mt-4 grid gap-3">
        <div className="flex justify-between gap-4 text-sm">
          <span className="text-gray-500">Customer Pays</span>
          <span className="font-black text-gray-950 text-right">{customerPays}</span>
        </div>

        <div className="flex justify-between gap-4 text-sm">
          <span className="text-gray-500">Fountain Ride Commission</span>
          <span className="font-black text-purple-700 text-right">{commission}</span>
        </div>

        <div className="flex justify-between gap-4 border-t pt-3 text-base">
          <span className="font-bold text-gray-700">Owner Receives</span>
          <span className="font-black text-green-700 text-right">{ownerTakeHome}</span>
        </div>
      </div>
    </div>
  )
}