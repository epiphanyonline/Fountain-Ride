'use client'

import { useState } from 'react'

const whatsappNumber = '2348168839382'

const faqs = [
  {
    question: 'What areas do you cover?',
    answer:
      'We currently cover Lagos, Oyo State, and other South West states in Nigeria.',
  },
  {
    question: 'Do you do airport pickup?',
    answer:
      'Yes. We provide airport pickup and drop-off services. Airport pickup bookings are completed via WhatsApp so we can properly confirm arrival details, destination, luggage, and pricing.',
  },
  {
    question: 'How much is daily hire?',
    answer:
      'Daily hire pricing depends on the type of vehicle and trip details. The average daily rate starts from around ₦150,000.',
  },
  {
    question: 'How much is city-to-city travel?',
    answer:
      'City-to-city pricing varies based on the destination, distance, tolls, and trip duration. Average pricing starts from around ₦200,000.',
  },
  {
    question: 'What time is daily hire?',
    answer:
      'Our standard daily hire period runs from 8:00am to 8:00pm.',
  },
  {
    question: 'What happens if I need extra hours?',
    answer:
      'Additional hours beyond the agreed booking period may attract late or overtime charges depending on the vehicle and trip arrangement.',
  },
  {
    question: 'Can I book city-to-city trips?',
    answer:
      'Yes. We support inter-state and city-to-city travel within covered South West locations and other selected destinations.',
  },
  {
    question: 'Is driver included?',
    answer:
      'Yes. All bookings come with a licensed and professional driver.',
  },
  {
    question: 'Can I book for my parents or someone else?',
    answer:
      'Yes. You can arrange bookings for your parents, relatives, clients, friends, or loved ones.',
  },
  {
    question: 'Do you allow night movement?',
    answer:
      'Our standard operating hours are from 8:00am to 8:00pm. Trips outside these hours may only be available upon prior approval.',
  },
  {
    question: 'How do I reserve a car?',
    answer:
      'You can reserve a car online by selecting your preferred vehicle and submitting your trip details. Our team will then contact you to confirm availability and payment.',
  },
  {
    question: 'Do I need an account to book?',
    answer:
      'No. You can book without creating an account. However, accurate contact details and an emergency contact may be required for identification and support purposes.',
  },
  {
    question: 'Can I pay deposit?',
    answer:
      'We currently operate on full payment confirmation before trips are finalized.',
  },
  {
    question: 'Is fuel included?',
    answer:
      'Vehicles are provided with at least a half tank of fuel at the start of the trip. Additional fuel usage during the trip becomes the customer’s responsibility.',
  },
  {
    question: 'Are toll fees included?',
    answer:
      'No. Toll gate charges, parking tickets, and similar route-related fees are not included in the standard booking price.',
  },
  {
    question: 'Who covers driver accommodation for interstate trips?',
    answer:
      'For interstate or overnight trips, the customer may be responsible for the driver’s accommodation and overnight allowance where applicable.',
  },
    {
    question: 'Will the same driver stay throughout my trip?',
    answer:
      'For longer or multi-day bookings, there may occasionally be a change of driver where necessary to ensure safety, proper rest, and service quality.',
  },
  {
    question: 'Are your drivers careful and experienced?',
    answer:
      'Yes. Our drivers are licensed, experienced, familiar with major routes, professionally trained, and committed to safe driving.',
  },
  {
    question: 'What happens if I forget something in the vehicle?',
    answer:
      'Please contact us as soon as possible if you leave any item behind. While we will do our best to assist, customers are advised to check their belongings before ending each trip.',
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
    <div className="fixed bottom-5 right-4 z-50">
      {open && (
        <div className="mb-3 w-[330px] max-w-[calc(100vw-2rem)] rounded-3xl bg-white shadow-2xl border overflow-hidden">
          <div className="bg-purple-800 text-white p-4">
            <p className="font-black">Ask Fountain Ride</p>
            <p className="text-sm text-purple-100">
              Quick answers before you book
            </p>
          </div>

          <div className="p-4">
            <div className="bg-[#f7f4fb] rounded-2xl p-4 text-sm text-gray-700 min-h-[80px]">
              {answer}
            </div>

            <div className="mt-4 space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {faqs.map((faq) => (
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
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="bg-purple-800 hover:bg-purple-900 text-white px-5 py-4 rounded-full shadow-xl font-black"
      >
        {open ? 'Close' : 'Ask Fountain Ride'}
      </button>
    </div>
  )
}