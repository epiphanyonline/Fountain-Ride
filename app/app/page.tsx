import Link from 'next/link'
import Image from 'next/image'
import RiderAppEntry from './RiderAppEntry'

function DriverIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"
      className="h-12 w-12" stroke="currentColor" strokeWidth="2.7"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="35" r="21" />
      <circle cx="32" cy="35" r="5" />
      <path d="M12.5 27h39M32 40v16M25 56h14" />
    </svg>
  )
}

function CarIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"
      className="h-12 w-12" stroke="currentColor" strokeWidth="2.7"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 26l5-12a6 6 0 0 1 5.5-3.7h15a6 6 0 0 1 5.5 3.7l5 12" />
      <path d="M10 27c0-2 2-4 5-4h34c3 0 5 2 5 4v15a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V27Z" />
      <path d="M17 46v6h9v-6M38 46v6h9v-6M16 34h9M39 34h9M29 36h6" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"
      className="h-6 w-6" stroke="currentColor" strokeWidth="2.3"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  )
}

function AccountIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"
      className="h-5 w-5" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.3" />
      <path d="M5.6 20c.4-4 2.8-6 6.4-6s6 2 6.4 6" />
    </svg>
  )
}

/**
 * App landing page for Android Rider Trusted Web Activity.
 * Existing public marketing homepage remains at /; only two booking
 * actions appear here. Existing customer accounts and booking flows
 * are reused rather than rebuilt.
 */
export default function RiderAppHome() {
  return (
    <main className="min-h-[100dvh] bg-[#f8faf8] text-slate-950">
      <RiderAppEntry />
      <div className="mx-auto max-w-[920px] px-5 pb-32 pt-6 sm:px-8 sm:pt-10">
        <header className="flex items-center justify-between gap-3">
          <Link href="/app" aria-label="Fountain Ride home"
            className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#075b46]">
            <Image
              src="/fountain-ride-mark.svg"
              alt=""
              width={44}
              height={44}
              priority
              className="h-11 w-11 shrink-0 rounded-[14px]"
            />
            <span className="min-w-0">
              <span className="block text-[19px] font-extrabold leading-6 tracking-[-0.045em]">
                Fountain Ride
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Mobile Garage
              </span>
            </span>
          </Link>

          <Link href="/rider/profile" aria-label="My profile"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-[#075b46] hover:text-[#075b46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075b46]">
            <AccountIcon />
          </Link>
        </header>

        <section className="mt-12 sm:mt-16">
          <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#087056]">
            Travel made simple
          </p>
          <h1 className="mt-3 max-w-xl text-[2.45rem] font-black leading-[1.09] tracking-[-0.055em] text-[#15241e] sm:text-[3.35rem]">
            How would you like to move today?
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-slate-600 sm:text-base">
            Choose a service to get started.
          </p>
        </section>

        <section aria-label="Choose your service"
          className="mt-9 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5">

          <Link href="/hire-driver"
            className="group relative flex min-h-[210px] flex-col justify-between overflow-hidden rounded-[28px] bg-[#075b46] p-6 text-white shadow-[0_12px_34px_rgba(7,91,70,0.17)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(7,91,70,0.23)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#0b8768] sm:min-h-[255px] sm:p-7">
            <span aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full border-[24px] border-white/[0.07]" />
            <span className="relative flex items-start justify-between gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-white/15">
                <DriverIcon />
              </span>
              <span className="grid h-10 w-10 place-items-center rounded-full border border-white/35 transition group-hover:translate-x-1">
                <ArrowIcon />
              </span>
            </span>
            <span className="relative mt-6 block">
              <span className="block text-[27px] font-extrabold tracking-[-0.045em] sm:text-[30px]">
                Hire a Driver
              </span>
              <span className="mt-1.5 block text-[14px] leading-6 text-white/85">
                Your car. Our professional driver.
              </span>
            </span>
          </Link>

          <Link href="/cars"
            className="group relative flex min-h-[210px] flex-col justify-between overflow-hidden rounded-[28px] border border-[#f4d778] bg-[#ffcc46] p-6 text-[#1c291f] shadow-[0_12px_34px_rgba(105,84,20,0.10)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(105,84,20,0.17)] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#b77a00] sm:min-h-[255px] sm:p-7">
            <span aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full border-[24px] border-white/30" />
            <span className="relative flex items-start justify-between gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-white/65 text-[#075b46]">
                <CarIcon />
              </span>
              <span className="grid h-10 w-10 place-items-center rounded-full border border-[#1c291f]/30 transition group-hover:translate-x-1">
                <ArrowIcon />
              </span>
            </span>
            <span className="relative mt-6 block">
              <span className="block text-[27px] font-extrabold tracking-[-0.045em] sm:text-[30px]">
                Hire a Car
              </span>
              <span className="mt-1.5 block text-[14px] leading-6 text-[#334337]">
                A vehicle with a driver included.
              </span>
            </span>
          </Link>
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-slate-500">
          <span>Already made a request?</span>
          <Link href="/rider"
            className="font-extrabold text-[#075b46] underline decoration-[#075b46]/30 underline-offset-4 hover:decoration-[#075b46] focus-visible:outline-2 focus-visible:outline-offset-2">
            View my bookings
          </Link>
        </div>

        <p className="mx-auto mt-12 max-w-sm text-center text-[12px] leading-6 text-slate-400">
          Fountain Ride connects your transport needs with professional driving services.
        </p>
      </div>
    </main>
  )
}
