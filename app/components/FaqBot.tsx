'use client'

import { useState } from 'react'

const whatsappNumber = '2348168839382'

export const fountainFaqs = [
  {
    question: 'What areas do you cover?',
    answer:
      'We currently cover Lagos, Oyo State, and other South West states in Nigeria.',
  },
  {
    question: 'Do you do airport pickup?',
    answer:
      'Yes. We provide airport pickup and drop-off services. Airport pickup bookings are completed via WhatsApp so we can confirm arrival details, destination, luggage and pricing.',
  },
  {
    question: 'How much is daily hire?',
    answer:
      'Daily hire pricing depends on the vehicle and trip details. The average daily rate starts from around ₦150,000.',
  },
  {
    question: 'How much is city-to-city travel?',
    answer:
      'City-to-city pricing varies by destination, distance, tolls and trip duration. Average pricing starts from around ₦200,000.',
  },
  {
    question: 'What time is daily hire?',
    answer: 'Our standard daily hire period runs from 8:00am to 8:00pm.',
  },
  {
    question: 'What happens if I need extra hours?',
    answer:
      'Extra hours beyond the agreed booking period attract a standard late fee of ₦10,000 per hour.',
  },
  {
    question: 'Is driver included?',
    answer: 'Yes. All bookings come with a licensed and professional driver.',
  },
  {
    question: 'Can I book for my parents or someone else?',
    answer:
      'Yes. You can arrange bookings for your parents, relatives, clients, friends or loved ones.',
  },
  {
    question: 'Do you allow night movement?',
    answer:
      'Our standard operating hours are 8:00am to 8:00pm. Trips outside these hours may only be available by prior approval.',
  },
  {
    question: 'Can I pay deposit?',
    answer:
      'We currently operate on full payment confirmation before trips are finalized.',
  },
  {
    question: 'Is fuel included?',
    answer:
      'Vehicles are provided with at least a half tank of fuel at the start of the trip. Additional fuel usage during the trip is the customer’s responsibility.',
  },
  {
    question: 'Are toll fees and parking included?',
    answer:
      'No. Toll fees, parking tickets and similar route-related costs are not included in the standard booking price.',
  },
  {
    question: 'Who covers driver accommodation for interstate trips?',
    answer:
      'For interstate or overnight trips, the customer may be responsible for the driver’s accommodation and overnight allowance where applicable.',
  },
  {
    question: 'Are your drivers careful and experienced?',
    answer:
      'Yes. Our drivers are licensed, experienced, familiar with major routes, professionally trained and committed to safe driving.',
  },
]

export default function FaqBot() {
  const [open, setOpen] = useState(false)
  const [answer, setAnswer] = useState(
    'Hi 👋 I’m here to answer common Fountain Ride questions.'
  )

  const whatsappText = encodeURIComponent(
    'Hello Fountain Ride, I need help with booking a car.'
  )

  return (
    <div className="fixed bottom-5 left-4 z-40">
      {open && (
        <div className="mb-3 w-[330px] max-w-[calc(100vw-2rem)] rounded-3xl bg-white shadow-2xl border overflow-hidden">
          <div className="bg-purple-800 text-white p-4">
            <p className="font-black">Ask Fountain Ride</p>
            <p className="text-sm text-purple-100">
              Quick answers before you book
            </p>
          </div>

          <div className="p-4">
            <div className="bg-[#f7f4fb] rounded-2xl p-4 text-sm text-gray-700 min-h-[90px] leading-relaxed">
              {answer}
            </div>

            <div className="mt-4 space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {fountainFaqs.map((faq) => (
                <button
                  key={faq.question}
                  onClick={() => setAnswer(faq.answer)}
                  className="w-full text-left text-sm bg-gray-50 hover:bg-purple-50 border rounded-2xl px-4 py-3 font-semibold"
                >
                  {faq.question}
                </button>
              ))}
            </div>

            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
              target="_blank"
            >
              <button className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-2xl font-bold">
                Continue on WhatsApp
              </button>
            </a>

            <p className="text-xs text-gray-400 mt-3 text-center">
              For live support, use “Chat with us” on the right.
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="bg-purple-800 hover:bg-purple-900 text-white px-5 py-4 rounded-full shadow-xl font-black"
      >
        {open ? 'Close FAQ' : 'Ask FAQ'}
      </button>
    </div>
  )
}