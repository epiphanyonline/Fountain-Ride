'use client'

import { useState } from 'react'

const whatsappNumber = '2348168839382'

const faqs = [
  {
    question: 'What areas do you cover?',
    answer: 'We currently cover Lagos, Oyo State, and other South West states in Nigeria.',
  },
  {
    question: 'Do you do airport pickup?',
    answer: 'Yes. We provide airport pickup and drop-off services.',
  },
  {
    question: 'How much is daily hire?',
    answer: 'Daily hire depends on the type of car. The average rate is around ₦150,000 per day.',
  },
  {
    question: 'What time is daily hire?',
    answer: 'Daily hire runs from 8:00am to 8:00pm.',
  },
  {
    question: 'Can I book city to city?',
    answer: 'Yes. We support city-to-city trips within our covered locations.',
  },
  {
    question: 'Is driver included?',
    answer: 'Yes. All bookings come with a driver.',
  },
  {
    question: 'Can I book for my parents?',
    answer: 'Yes. You can book for your parents, relatives, clients, or loved ones.',
  },
  {
    question: 'Do you allow night movement?',
    answer: 'No. Our standard service hours are 8:00am to 8:00pm.',
  },
  {
    question: 'How do I reserve a car?',
    answer: 'You can reserve a car by selecting your preferred vehicle online and submitting your booking request.',
  },
  {
    question: 'Can I pay deposit?',
    answer: 'No. We currently accept full payment only.',
  },
  {
    question: 'Are your drivers careful?',
    answer: 'Yes. Our drivers are licensed, route-familiar, well-trained, and drive carefully.',
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