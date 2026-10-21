import Link from 'next/link'
import MarketplaceNav from './components/MarketplaceNav'

const services = [
  {
    number: '01',
    label: 'I ALREADY HAVE A CAR',
    title: 'Hire a Driver',
    tagline: 'Your car. Our driver.',
    description:
      'Need someone reliable behind the wheel? Request a professional driver for your personal journeys, family outings, business travel, events or longer trips.',
    href: '/hire-driver',
    cta: 'Hire a Driver',
    dark: false,
    features: ['Use your own vehicle', 'Receive and negotiate offers', 'Manage your booking'],
  },
  {
    number: '02',
    label: 'I NEED A CAR',
    title: 'Hire a Car',
    tagline: 'Vehicle + driver included.',
    description:
      'Choose a vehicle for an everyday journey, airport transfer, family outing, event or longer booking. Your car hire comes with a driver.',
    href: '/cars',
    cta: 'Explore Available Cars',
    dark: true,
    features: ['Browse available vehicles', 'Request a quotation', 'Car and driver together'],
  },
]

const steps = [
  {
    number: '01',
    title: 'Choose your service',
    description: 'Hire a driver for your car or hire a car with a driver.',
  },
  {
    number: '02',
    title: 'Tell us what you need',
    description: 'Share your journey, schedule and booking requirements.',
  },
  {
    number: '03',
    title: 'Review your offer',
    description: 'Receive a quotation, discuss the details and agree on the price.',
  },
  {
    number: '04',
    title: 'Confirm your booking',
    description: 'Follow the available payment and confirmation steps.',
  },
]

export default function Home() {
  return (
    <>
      <MarketplaceNav />

      <main className="min-h-screen bg-[#F8F7FB] text-slate-950">

        <section
          id="services"
          className="mx-auto max-w-7xl scroll-mt-24 px-5 pt-6 pb-12 sm:px-8 sm:pt-8 lg:px-10 lg:pt-10 lg:pb-16"
        >

          <div className="grid gap-6 lg:grid-cols-2">
            {services.map((service) => (
              <article
                key={service.number}
                className={`flex min-h-[480px] flex-col overflow-hidden rounded-[2rem] p-8 shadow-xl sm:p-10 ${
                  service.dark
                    ? 'bg-[#10172A] text-white'
                    : 'border border-purple-100 bg-white text-slate-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-black tracking-[0.18em] ${
                      service.dark ? 'text-purple-300' : 'text-purple-700'
                    }`}
                  >
                    {service.label}
                  </span>
                  <span
                    className={`text-4xl font-black ${
                      service.dark ? 'text-white/15' : 'text-purple-100'
                    }`}
                  >
                    {service.number}
                  </span>
                </div>

                <h3 className="mt-12 text-4xl font-black tracking-tight sm:text-5xl">
                  {service.title}
                </h3>
                <p
                  className={`mt-3 text-xl font-bold ${
                    service.dark ? 'text-purple-300' : 'text-purple-700'
                  }`}
                >
                  {service.tagline}
                </p>

                <p
                  className={`mt-6 max-w-lg leading-8 ${
                    service.dark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {service.description}
                </p>

                <div className="mt-8 flex flex-wrap gap-2">
                  {service.features.map((feature) => (
                    <span
                      key={feature}
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${
                        service.dark
                          ? 'bg-white/10 text-slate-200'
                          : 'bg-purple-50 text-purple-800'
                      }`}
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                <Link
                  href={service.href}
                  className={`mt-auto inline-flex w-full items-center justify-center rounded-2xl px-6 py-4 text-base font-black transition sm:w-fit ${
                    service.dark
                      ? 'bg-purple-600 text-white hover:bg-purple-500'
                      : 'bg-[#10172A] text-white hover:bg-purple-800'
                  }`}
                >
                  {service.cta} <span className="ml-3" aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-purple-700">
              Simple by design
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              From request to agreement.
            </h2>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="rounded-3xl border border-slate-100 bg-[#F8F7FB] p-7"
                >
                  <span className="text-3xl font-black text-purple-700">
                    {step.number}
                  </span>
                  <h3 className="mt-7 text-xl font-black">{step.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] bg-purple-700 p-8 text-white sm:p-10">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-200">
                For professional drivers
              </p>
              <h2 className="mt-5 text-3xl font-black sm:text-4xl">
                Your next opportunity starts here.
              </h2>
              <p className="mt-5 leading-8 text-purple-100">
                Join Fountain Ride to connect with customers looking for
                professional driving services.
              </p>
              <Link
                href="/driver/register"
                className="mt-8 inline-flex rounded-2xl bg-white px-6 py-4 font-bold text-purple-800"
              >
                Join as a Driver
              </Link>
            </div>

            <div className="rounded-[2rem] bg-[#10172A] p-8 text-white sm:p-10">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-300">
                For vehicle owners
              </p>
              <h2 className="mt-5 text-3xl font-black sm:text-4xl">
                Put your vehicle to work.
              </h2>
              <p className="mt-5 leading-8 text-slate-300">
                List your eligible vehicle and connect with customers seeking
                chauffeur-driven car hire.
              </p>
              <Link
                href="/list-your-car"
                className="mt-8 inline-flex rounded-2xl bg-purple-600 px-6 py-4 font-bold text-white"
              >
                List Your Car
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-[#080D1C] px-5 py-20 text-center text-white sm:px-8 lg:py-28">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-300">
            Fountain Ride Mobile Garage™
          </p>
          <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-black tracking-[-0.045em] sm:text-6xl">
            Your journey.
            <span className="block text-purple-400">Your choice.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Beginning in Ibadan, with a vision to make professional transport
            services more accessible across Nigeria.
          </p>
          <Link
            href="#services"
            className="mt-9 inline-flex rounded-2xl bg-purple-600 px-8 py-4 font-bold text-white transition hover:bg-purple-500"
          >
            Find Your Way to Move
          </Link>
        </section>

        <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-slate-500 sm:flex-row">
            <span>© {new Date().getFullYear()} Fountain Ride. Mobile Garage™.</span>
            <div className="flex flex-wrap gap-5">
              <Link href="/hire-driver" className="hover:text-purple-700">
                Hire a Driver
              </Link>
              <Link href="/cars" className="hover:text-purple-700">
                Hire a Car
              </Link>
              <Link href="/driver/login" className="hover:text-purple-700">
                Driver Login
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}
