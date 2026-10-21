'use client'



import { useEffect, useState } from 'react'



import { useParams, useRouter } from 'next/navigation'



import MarketplaceNav from '../../../components/MarketplaceNav'



type Vehicle = {



  id: string



  name: string



  daily_rate: number | null



  transmission: string | null



  fuel_type: string | null



  seats: number | null



  image_url: string | null



  image_urls: string[] | null



  description: string | null



  status: string | null



}



type HireRequest = {



  id: string



  booking_ref: string



  car_id: string



  customer_name: string



  status: string



  currency: string



  pickup_address: string



  destination_address: string



  pickup_city: string | null



  pickup_state: string | null



  destination_city: string | null



  destination_state: string | null



  start_date: string



  start_time: string | null



  end_date: string | null



  end_time: string | null



  trip_type: string | null



  passenger_count: number | null



  special_requirements: string | null



  guide_daily_rate: number | null



  agreed_amount: number | null



  created_at: string



}



type Offer = {



  id: string



  vehicle_hire_request_id: string



  car_id: string



  amount: number



  included_days: number | null



  included_hours: number | null



  overtime_rate: number | null



  extra_day_rate: number | null



  additional_charges: number



  additional_charges_note: string | null



  offer_conditions: string | null



  message: string | null



  status: string



  version_number: number



  accepted_at: string | null



  created_at: string



  unread_message_count?: number



  latest_owner_message?: {



    id: string



    body: string



    created_at: string



  } | null



}



type NegotiationMessage = {



  id: string



  vehicle_hire_request_id: string



  car_id: string



  sender_role: 'customer' | 'owner' | 'admin'



  body: string



  customer_read_at: string | null



  owner_read_at: string | null



  created_at: string



}



type Agreement = {



  id: string



  accepted_offer_id: string



  car_id: string



  agreed_amount: number



  included_days: number | null



  included_hours: number | null



  overtime_rate: number | null



  extra_day_rate: number | null



  additional_charges: number



  offer_conditions: string | null



  accepted_at: string



}



function money(



  value?: number | null,



  currency = 'NGN'



) {



  if (



    value === null ||



    value === undefined



  ) {



    return '—'



  }



  try {



    return new Intl.NumberFormat(



      'en-NG',



      {



        style: 'currency',



        currency,



        maximumFractionDigits: 0,



      }



    ).format(Number(value))



  } catch {



    return `₦${Number(value).toLocaleString()}`



  }



}



function words(value?: string | null) {



  if (!value) return 'Not specified'



  return value



    .replaceAll('_', ' ')



    .replace(/\b\w/g, letter =>



      letter.toUpperCase()



    )



}



function formatDate(value?: string | null) {



  if (!value) return 'Not specified'



  const date = new Date(



    `${value}T12:00:00`



  )



  if (Number.isNaN(date.getTime())) {



    return value



  }



  return new Intl.DateTimeFormat(



    'en-GB',



    {



      weekday: 'short',



      day: 'numeric',



      month: 'short',



      year: 'numeric',



    }



  ).format(date)



}



function getVehicleImage(



  vehicle: Vehicle | null



) {



  if (!vehicle) return ''



  if (



    Array.isArray(vehicle.image_urls) &&



    vehicle.image_urls.length > 0



  ) {



    return vehicle.image_urls[0] || ''



  }



  return vehicle.image_url || ''



}



export default function VehicleHireRequestPage() {



  const params = useParams()



  const router = useRouter()



  const id = String(params.id || '')



  const [hireRequest, setHireRequest] =



    useState<HireRequest | null>(null)



  const [vehicle, setVehicle] =



    useState<Vehicle | null>(null)



  const [offers, setOffers] =



    useState<Offer[]>([])



  const [agreement, setAgreement] =



    useState<Agreement | null>(null)



  const [messages, setMessages] =



    useState<NegotiationMessage[]>([])



  const [messageText, setMessageText] = useState('')



  const [sendingMessage, setSendingMessage] = useState(false)



  const [messageError, setMessageError] = useState('')



  const [acceptingOffer, setAcceptingOffer] =



    useState(false)



  const [acceptError, setAcceptError] =



    useState('')



  const [showAcceptConfirm, setShowAcceptConfirm] =



    useState(false)



  const [startingPayment, setStartingPayment] =

    useState(false)



  const [verifyingPayment, setVerifyingPayment] =

    useState(false)



  const [paymentError, setPaymentError] =

    useState('')



  const [paymentMessage, setPaymentMessage] =

    useState('')



  const [loading, setLoading] =



    useState(true)



  const [refreshing, setRefreshing] =



    useState(false)



  const [error, setError] =



    useState('')



  async function loadRequest(



    quiet = false



  ) {



    if (!id) return



    if (quiet) {



      setRefreshing(true)



    } else {



      setLoading(true)



    }



    setError('')



    try {



      const accessToken =



        localStorage.getItem(



          `vehicleHireAccess:${id}`



        )



      if (!accessToken) {



        throw new Error(



          'This device does not have access to this Vehicle Hire request.'



        )



      }



      const response = await fetch(



        `/api/marketplace/vehicle-hire/${id}`,



        {



          headers: {



            'x-vehicle-hire-access-token':



              accessToken,



          },



          cache: 'no-store',



        }



      )



      const data =



        await response.json()



      if (!response.ok) {



        throw new Error(



          data.error ||



            'Unable to load request.'



        )



      }



      setHireRequest(data.request)



      setVehicle(data.vehicle || null)



      setOffers(data.offers || [])



      setAgreement(



        data.agreement || null



      )



    } catch (err: any) {



      setError(



        err.message ||



          'Unable to load request.'



      )



    } finally {



      setLoading(false)



      setRefreshing(false)



    }



  }



  async function loadMessages(quiet = false) {



    if (!id) return



    if (!quiet) setMessageError('')



    try {



      const accessToken = localStorage.getItem(



        `vehicleHireAccess:${id}`



      )



      if (!accessToken) {



        throw new Error(



          'This device does not have access to this Vehicle Hire request.'



        )



      }



      const response = await fetch(



        `/api/marketplace/vehicle-hire/${id}/messages`,



        {



          headers: {



            'x-vehicle-hire-access-token': accessToken,



          },



          cache: 'no-store',



        }



      )



      const data = await response.json()



      if (!response.ok) {



        throw new Error(



          data.error || 'Unable to load negotiation messages.'



        )



      }



      setMessages(data.messages || [])



    } catch (err: any) {



      if (!quiet) {



        setMessageError(



          err.message || 'Unable to load negotiation messages.'



        )



      }



    }



  }



  async function refreshRequest() {



    await Promise.all([



      loadRequest(true),



      loadMessages(true),



    ])



  }



  async function sendMessage() {



    const body = messageText.trim()



    if (!body) {



      setMessageError('Enter a message before sending.')



      return



    }



    if (!id) return



    setSendingMessage(true)



    setMessageError('')



    try {



      const accessToken = localStorage.getItem(



        `vehicleHireAccess:${id}`



      )



      if (!accessToken) {



        throw new Error(



          'This device does not have access to this Vehicle Hire request.'



        )



      }



      const response = await fetch(



        `/api/marketplace/vehicle-hire/${id}/messages`,



        {



          method: 'POST',



          headers: {



            'Content-Type': 'application/json',



            'x-vehicle-hire-access-token': accessToken,



          },



          body: JSON.stringify({ message: body }),



        }



      )



      const data = await response.json()



      if (!response.ok) {



        throw new Error(



          data.error || 'Unable to send your message.'



        )



      }



      setMessageText('')



      await Promise.all([



        loadMessages(true),



        loadRequest(true),



      ])



    } catch (err: any) {



      setMessageError(



        err.message || 'Unable to send your message.'



      )



    } finally {



      setSendingMessage(false)



    }



  }



  async function acceptCurrentOffer() {



    if (!id) return







    const currentOfferForAction =



      offers.find(



        offer =>



          ![



            'withdrawn',



            'declined',



            'superseded',



            'not_selected',



          ].includes(offer.status)



      ) || null







    if (!currentOfferForAction) return







    setAcceptingOffer(true)



    setAcceptError('')







    try {



      const accessToken = localStorage.getItem(



        `vehicleHireAccess:${id}`



      )







      if (!accessToken) {



        throw new Error(



          'This device does not have access to this Vehicle Hire request.'



        )



      }







      const response = await fetch(



        `/api/marketplace/vehicle-hire/${id}/accept`,



        {



          method: 'POST',



          headers: {



            'Content-Type': 'application/json',



            'x-vehicle-hire-access-token': accessToken,



          },



          body: JSON.stringify({



            offerId: currentOfferForAction.id,



          }),



        }



      )







      const data = await response.json()







      if (!response.ok) {



        throw new Error(



          data.error || 'Unable to accept this quotation.'



        )



      }







      setShowAcceptConfirm(false)







      await Promise.all([



        loadRequest(true),



        loadMessages(true),



      ])



    } catch (err: any) {



      setAcceptError(



        err.message || 'Unable to accept this quotation.'



      )



    } finally {



      setAcceptingOffer(false)



    }



  }







  async function startPayment() {

    if (!id) return



    setStartingPayment(true)

    setPaymentError('')

    setPaymentMessage('')



    try {

      const accessToken = localStorage.getItem(

        `vehicleHireAccess:${id}`

      )



      if (!accessToken) {

        throw new Error(

          'This device does not have access to this Vehicle Hire request.'

        )

      }



      const response = await fetch(

        `/api/marketplace/vehicle-hire/${id}/pay`,

        {

          method: 'POST',

          headers: {

            'x-vehicle-hire-access-token': accessToken,

          },

        }

      )



      const data = await response.json()



      if (!response.ok) {

        throw new Error(

          data.error || 'Unable to start secure payment.'

        )

      }



      if (!data.authorizationUrl) {

        throw new Error(

          'Payment checkout URL was not returned.'

        )

      }



      window.location.href = data.authorizationUrl

    } catch (err: any) {

      setPaymentError(

        err.message || 'Unable to start secure payment.'

      )

      setStartingPayment(false)

    }

  }



  async function verifyReturnedPayment(reference: string) {

    if (!id || !reference) return



    setVerifyingPayment(true)

    setPaymentError('')

    setPaymentMessage(

      'Confirming your payment securely with Paystack...'

    )



    try {

      const accessToken = localStorage.getItem(

        `vehicleHireAccess:${id}`

      )



      if (!accessToken) {

        throw new Error(

          'This device does not have access to this Vehicle Hire request.'

        )

      }



      const response = await fetch(

        `/api/marketplace/vehicle-hire/${id}/pay/verify`,

        {

          method: 'POST',

          headers: {

            'Content-Type': 'application/json',

            'x-vehicle-hire-access-token': accessToken,

          },

          body: JSON.stringify({ reference }),

        }

      )



      const data = await response.json()



      if (!response.ok) {

        throw new Error(

          data.error || 'Unable to verify payment.'

        )

      }



      setPaymentMessage(

        'Payment confirmed. Your chauffeur-driven vehicle is booked.'

      )



      await Promise.all([

        loadRequest(true),

        loadMessages(true),

      ])



      window.history.replaceState(

        {},

        '',

        window.location.pathname

      )

    } catch (err: any) {

      setPaymentMessage('')

      setPaymentError(

        err.message ||

          'We could not confirm this payment yet. Please refresh and try again.'

      )

    } finally {

      setVerifyingPayment(false)

    }

  }



  useEffect(() => {

    if (!id) return



    loadRequest()

    loadMessages()



    const search = new URLSearchParams(

      window.location.search

    )



    const reference =

      search.get('reference') ||

      search.get('trxref') ||

      ''



    if (reference) {

      verifyReturnedPayment(reference)

    }

  }, [id])



  if (loading) {



    return (



      <>



        <MarketplaceNav />



        <main className="min-h-screen bg-[#faf8fd] px-4 py-12">



          <div className="max-w-5xl mx-auto">



            <div className="bg-white border rounded-[2rem] p-8">



              <p className="font-black">



                Loading your Vehicle Hire



                request...



              </p>



            </div>



          </div>



        </main>



      </>



    )



  }



  if (



    error ||



    !hireRequest



  ) {



    return (



      <>



        <MarketplaceNav />



        <main className="min-h-screen bg-[#faf8fd] px-4 py-12">



          <div className="max-w-xl mx-auto bg-white border rounded-[2rem] p-7">



            <p className="text-xs font-black text-purple-700 tracking-widest">



              FOUNTAIN RIDE VEHICLE HIRE



            </p>



            <h1 className="text-2xl font-black mt-2">



              Request unavailable



            </h1>



            <p className="text-gray-600 mt-3">



              {error ||



                'We could not load this request.'}



            </p>



            <button



              type="button"



              onClick={() =>



                router.push('/cars')



              }



              className="mt-6 bg-purple-700 text-white px-6 py-3 rounded-2xl font-black"



            >



              Browse Vehicles



            </button>



          </div>



        </main>



      </>



    )



  }



  const currentOffer =



    offers.find(



      offer =>



        ![



          'withdrawn',



          'declined',



          'superseded',



          'not_selected',



        ].includes(offer.status)



    ) || null



  const vehicleImage =



    getVehicleImage(vehicle)



  return (



    <>



      <MarketplaceNav />



      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f2e9ff_0,#faf8fd_42%,#f7f4fb_100%)] px-4 py-7 md:py-10 pb-28">



        <div className="max-w-6xl mx-auto">



          {/* HEADER */}



          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">



            <div>



              <p className="text-xs font-black text-purple-700 tracking-[.18em]">



                VEHICLE HIRE REQUEST



              </p>



              <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-2">



                {hireRequest.booking_ref}



              </h1>



              <p className="text-gray-600 mt-2">



                {vehicle?.name ||



                  'Selected vehicle'}



                {' · '}



                Driver included



              </p>



            </div>



            <StatusCard



              status={



                hireRequest.status



              }



              hasOffer={



                Boolean(currentOffer)



              }



            />



          </div>



          {/* AGREEMENT */}



          {agreement && (



            <section className="mt-6 bg-amber-50 border border-amber-200 rounded-[2rem] p-6">



              <p className="text-xs font-black tracking-widest text-amber-700">



                QUOTATION ACCEPTED



              </p>



              <h2 className="text-2xl font-black mt-2">



                Vehicle hire price agreed



              </h2>



              <p className="text-gray-600 mt-2">



                Final agreed amount:{' '}



                <b className="text-gray-950">



                  {money(



                    agreement.agreed_amount,



                    hireRequest.currency



                  )}



                </b>



              </p>



              <p className="text-sm text-gray-600 mt-3">



                This amount covers the selected



                vehicle and its driver together.



              </p>







              {hireRequest.status === 'awaiting_payment' && (



                <div className="mt-5 bg-white border border-amber-200 rounded-2xl p-4">



                  <p className="font-black">



                    Next step: secure payment



                  </p>



                  <p className="text-sm text-gray-600 mt-2 leading-6">



                    Your quotation is now locked. Payment will be completed



                    securely on Fountain Ride to confirm the booking.



                  </p>



                  {paymentMessage && (

                    <div className="mt-4 bg-green-50 border border-green-200 text-green-800 rounded-xl p-3 text-sm font-semibold">

                      {paymentMessage}

                    </div>

                  )}



                  {paymentError && (

                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm font-semibold">

                      {paymentError}

                    </div>

                  )}



                  <button

                    type="button"

                    onClick={startPayment}

                    disabled={startingPayment || verifyingPayment}

                    className="mt-4 w-full bg-purple-700 hover:bg-purple-800 text-white px-5 py-3 rounded-xl font-black disabled:opacity-50 disabled:cursor-not-allowed"

                  >

                    {verifyingPayment

                      ? 'Confirming payment...'

                      : startingPayment

                        ? 'Opening secure payment...'

                        : `Proceed to Payment — ${money(

                            agreement.agreed_amount,

                            hireRequest.currency

                          )}`}

                  </button>



                  <p className="text-xs text-gray-500 mt-3 text-center">

                    Secure checkout powered by Paystack.

                  </p>



                </div>



              )}



              {hireRequest.status === 'confirmed' && (

                <div className="mt-5 bg-green-50 border border-green-200 rounded-2xl p-4">

                  <p className="font-black text-green-900">

                    Payment confirmed

                  </p>

                  <p className="text-sm text-green-800 mt-2 leading-6">

                    Your chauffeur-driven vehicle booking is confirmed. Fountain Ride has recorded your secure payment.

                  </p>

                </div>

              )}



            </section>



          )}



          <div className="grid lg:grid-cols-[1fr_.78fr] gap-6 mt-6">



            {/* LEFT */}



            <div className="space-y-6">



              {/* VEHICLE */}



              <section className="bg-white border rounded-[2rem] overflow-hidden">



                {vehicleImage && (



                  <div className="h-64 md:h-80 bg-gray-100">



                    <img



                      src={vehicleImage}



                      alt={



                        vehicle?.name ||



                        'Vehicle'



                      }



                      className="w-full h-full object-cover"



                    />



                  </div>



                )}



                <div className="p-5 md:p-7">



                  <div className="flex flex-wrap gap-2">



                    <span className="bg-purple-100 text-purple-800 rounded-full px-3 py-1 text-xs font-black">



                      DRIVER INCLUDED



                    </span>



                    <span className="bg-green-100 text-green-800 rounded-full px-3 py-1 text-xs font-black">



                      CHAUFFEUR-DRIVEN



                    </span>



                  </div>



                  <h2 className="text-2xl md:text-3xl font-black mt-4">



                    {vehicle?.name ||



                      'Selected vehicle'}



                  </h2>



                  {vehicle && (



                    <p className="text-sm text-gray-500 mt-2">



                      {vehicle.transmission ||



                        'Transmission not specified'}



                      {' · '}



                      {vehicle.fuel_type ||



                        'Fuel not specified'}



                      {' · '}



                      {vehicle.seats ||



                        '—'}{' '}



                      seats



                    </p>



                  )}



                  <div className="mt-5 bg-gray-50 rounded-2xl p-4">



                    <p className="text-xs font-bold text-gray-500">



                      GUIDE PRICE



                    </p>



                    <p className="text-2xl font-black mt-1">



                      From{' '}



                      {money(



                        hireRequest.guide_daily_rate,



                        hireRequest.currency



                      )}



                      <span className="text-sm font-semibold text-gray-500">



                        {' '}



                        / day



                      </span>



                    </p>



                    <p className="text-xs text-gray-500 mt-2">



                      The guide price is not the



                      final agreed fare.



                    </p>



                  </div>



                </div>



              </section>



              {/* JOURNEY */}



              <section className="bg-white border rounded-[2rem] p-5 md:p-7">



                <p className="text-xs font-black text-purple-700 tracking-widest">



                  YOUR JOURNEY



                </p>



                <h2 className="text-2xl font-black mt-1">



                  Quotation request



                </h2>



                <div className="grid sm:grid-cols-2 gap-4 mt-6">



                  <Info



                    label="Trip type"



                    value={words(



                      hireRequest.trip_type



                    )}



                  />



                  <Info



                    label="Passengers"



                    value={



                      hireRequest.passenger_count !==



                      null



                        ? String(



                            hireRequest.passenger_count



                          )



                        : 'Not specified'



                    }



                  />



                  <Info



                    label="Pickup date"



                    value={formatDate(



                      hireRequest.start_date



                    )}



                  />



                  <Info



                    label="Pickup time"



                    value={



                      hireRequest.start_time ||



                      'Not specified'



                    }



                  />



                  <Info



                    label="Return date"



                    value={formatDate(



                      hireRequest.end_date



                    )}



                  />



                  <Info



                    label="Expected return time"



                    value={



                      hireRequest.end_time ||



                      'Not specified'



                    }



                  />



                </div>



              </section>



              {/* ROUTE */}



              <section className="bg-white border rounded-[2rem] p-5 md:p-7">



                <p className="text-xs font-black text-purple-700 tracking-widest">



                  ROUTE



                </p>



                <h2 className="text-2xl font-black mt-1">



                  Journey details



                </h2>



                <div className="mt-6 space-y-4">



                  <RoutePoint



                    number="A"



                    label="Pickup"



                    value={



                      hireRequest.pickup_address



                    }



                  />



                  <div className="ml-[19px] h-5 border-l-2 border-dashed border-purple-200" />



                  <RoutePoint



                    number="B"



                    label="Destination"



                    value={



                      hireRequest.destination_address



                    }



                  />



                </div>



                {hireRequest.special_requirements && (



                  <div className="border-t mt-6 pt-5">



                    <p className="text-xs font-black text-gray-500">



                      ADDITIONAL DETAILS



                    </p>



                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">



                      {



                        hireRequest.special_requirements



                      }



                    </p>



                  </div>



                )}



              </section>



            </div>



            {/* RIGHT */}



            <aside className="space-y-6">



              {/* QUOTATION */}



              <section className="bg-gray-950 text-white rounded-[2rem] p-6">



                <div className="flex items-start justify-between gap-4">



                  <div>



                    <p className="text-xs font-black text-purple-300 tracking-widest">



                      OWNER QUOTATION



                    </p>



                    <h2 className="text-2xl font-black mt-2">



                      {currentOffer



                        ? 'Quotation received'



                        : 'Quotation requested'}



                    </h2>



                  </div>



                  <button



                    type="button"



                    onClick={() =>



                      refreshRequest()



                    }



                    disabled={refreshing}



                    className="border border-white/20 px-3 py-2 rounded-xl text-xs font-black disabled:opacity-50"



                  >



                    {refreshing



                      ? 'Checking...'



                      : 'Refresh'}



                  </button>



                </div>



                {!currentOffer ? (



                  <div className="border-t border-white/10 mt-5 pt-5">



                    <div className="w-11 h-11 rounded-full bg-purple-700 flex items-center justify-center font-black text-xl">



                      ✓



                    </div>



                    <p className="font-black mt-4">



                      Request sent



                    </p>



                    <p className="text-sm text-gray-400 mt-2 leading-6">



                      Your journey details have



                      been submitted for this



                      vehicle. The owner can review



                      your request and send a



                      quotation for the vehicle and



                      driver together.



                    </p>



                    <div className="mt-5 bg-white/5 border border-white/10 rounded-2xl p-4">



                      <p className="text-xs font-black text-purple-300">



                        WHAT HAPPENS NEXT



                      </p>



                      <p className="text-sm text-gray-300 mt-2 leading-6">



                        Receive quotation →



                        discuss or negotiate →



                        accept the final offer →



                        pay securely → booking



                        confirmed.



                      </p>



                    </div>



                  </div>



                ) : (



                  <div className="border-t border-white/10 mt-5 pt-5">



                    <p className="text-4xl font-black">



                      {money(



                        currentOffer.amount,



                        hireRequest.currency



                      )}



                    </p>



                    <p className="text-sm text-gray-400 mt-2">



                      Vehicle + driver package



                    </p>



                    <div className="grid grid-cols-2 gap-3 mt-5">



                      <DarkInfo



                        label="Days included"



                        value={



                          currentOffer.included_days !==



                          null



                            ? String(



                                currentOffer.included_days



                              )



                            : '—'



                        }



                      />



                      <DarkInfo



                        label="Hours included"



                        value={



                          currentOffer.included_hours !==



                          null



                            ? String(



                                currentOffer.included_hours



                              )



                            : '—'



                        }



                      />



                    </div>



                    {currentOffer.message && (



                      <div className="mt-4 bg-white/5 rounded-2xl p-4">



                        <p className="text-xs font-black text-purple-300">



                          OWNER MESSAGE



                        </p>



                        <p className="text-sm text-gray-200 mt-2">



                          {currentOffer.message}



                        </p>



                      </div>



                    )}



                    <div className="grid grid-cols-2 gap-3 mt-3">



                      <DarkInfo



                        label="Extra day rate"



                        value={money(



                          currentOffer.extra_day_rate,



                          hireRequest.currency



                        )}



                      />



                      <DarkInfo



                        label="Overtime / hour"



                        value={money(



                          currentOffer.overtime_rate,



                          hireRequest.currency



                        )}



                      />



                    </div>



                    {Number(currentOffer.additional_charges || 0) > 0 && (



                      <div className="mt-3 bg-white/5 border border-white/10 rounded-2xl p-4">



                        <p className="text-xs font-black text-purple-300">



                          ADDITIONAL CHARGES



                        </p>



                        <p className="font-black mt-2">



                          {money(



                            currentOffer.additional_charges,



                            hireRequest.currency



                          )}



                        </p>



                        {currentOffer.additional_charges_note && (



                          <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">



                            {currentOffer.additional_charges_note}



                          </p>



                        )}



                      </div>



                    )}



                    {currentOffer.offer_conditions && (



                      <div className="mt-3 bg-white/5 border border-white/10 rounded-2xl p-4">



                        <p className="text-xs font-black text-purple-300">



                          CONDITIONS / INCLUSIONS



                        </p>



                        <p className="text-sm text-gray-200 mt-2 whitespace-pre-wrap">



                          {currentOffer.offer_conditions}



                        </p>



                      </div>



                    )}



                    <div className="mt-5 border border-purple-500/30 bg-purple-500/10 rounded-2xl p-4">



                      <p className="text-sm font-black">



                        Review before agreeing



                      </p>



                      <p className="text-xs text-gray-300 mt-2 leading-5">



                        Discuss the quotation below if you need any change.



                        A price or term change must be issued as an updated



                        quotation before you accept it.



                      </p>



                    </div>







                    {['requested', 'negotiating'].includes(



                      hireRequest.status



                    ) && !agreement && (



                      <div className="mt-4">



                        {!showAcceptConfirm ? (



                          <button



                            type="button"



                            onClick={() => {



                              setAcceptError('')



                              setShowAcceptConfirm(true)



                            }}



                            className="w-full bg-purple-600 hover:bg-purple-500 text-white px-5 py-4 rounded-2xl font-black"



                          >



                            Accept {money(



                              currentOffer.amount,



                              hireRequest.currency



                            )} Quote



                          </button>



                        ) : (



                          <div className="bg-white text-gray-950 rounded-2xl p-4">



                            <p className="font-black">



                              Accept this quotation?



                            </p>



                            <p className="text-sm text-gray-600 mt-2 leading-6">



                              You are accepting the current vehicle + driver



                              package for{' '}



                              <b>



                                {money(



                                  currentOffer.amount,



                                  hireRequest.currency



                                )}



                              </b>



                              . Fountain Ride will recheck the vehicle&apos;s



                              availability before locking the agreement.



                            </p>



                            <div className="grid grid-cols-2 gap-3 mt-4">



                              <button



                                type="button"



                                onClick={() => {



                                  setShowAcceptConfirm(false)



                                  setAcceptError('')



                                }}



                                disabled={acceptingOffer}



                                className="border px-4 py-3 rounded-xl font-black disabled:opacity-50"



                              >



                                Not yet



                              </button>



                              <button



                                type="button"



                                onClick={acceptCurrentOffer}



                                disabled={acceptingOffer}



                                className="bg-purple-700 text-white px-4 py-3 rounded-xl font-black disabled:opacity-50"



                              >



                                {acceptingOffer



                                  ? 'Accepting...'



                                  : 'Yes, accept quote'}



                              </button>



                            </div>



                          </div>



                        )}







                        {acceptError && (



                          <div className="mt-3 bg-red-950/40 border border-red-400/30 text-red-100 rounded-2xl p-4 text-sm font-semibold">



                            {acceptError}



                          </div>



                        )}



                      </div>



                    )}



                  </div>



                )}



              </section>



              {/* NEGOTIATION */}



              {currentOffer && (



                <section className="bg-white border rounded-[2rem] p-5">



                  <div className="flex items-start justify-between gap-4">



                    <div>



                      <p className="text-xs font-black text-purple-700 tracking-widest">



                        NEGOTIATION



                      </p>



                      <h3 className="font-black text-xl mt-1">



                        Discuss this quotation



                      </h3>



                    </div>



                    <button



                      type="button"



                      onClick={() => loadMessages()}



                      className="border px-3 py-2 rounded-xl text-xs font-black"



                    >



                      Refresh chat



                    </button>



                  </div>



                  <p className="text-sm text-gray-600 mt-2 leading-6">



                    Ask a question or negotiate the quotation here. Any agreed



                    price or term change must appear in a new quotation before



                    acceptance.



                  </p>



                  <div className="mt-5 max-h-80 overflow-y-auto space-y-3">



                    {messages.length === 0 ? (



                      <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-500">



                        No negotiation messages yet.



                      </div>



                    ) : (



                      messages.map(message => {



                        const mine = message.sender_role === 'customer'



                        return (



                          <div



                            key={message.id}



                            className={`flex ${



                              mine ? 'justify-end' : 'justify-start'



                            }`}



                          >



                            <div



                              className={`max-w-[88%] rounded-2xl px-4 py-3 ${



                                mine



                                  ? 'bg-purple-700 text-white'



                                  : 'bg-gray-100 text-gray-900'



                              }`}



                            >



                              <p



                                className={`text-[11px] font-black ${



                                  mine



                                    ? 'text-purple-200'



                                    : 'text-purple-700'



                                }`}



                              >



                                {mine ? 'YOU' : 'VEHICLE OWNER'}



                              </p>



                              <p className="text-sm mt-1 whitespace-pre-wrap break-words">



                                {message.body}



                              </p>



                              <p



                                className={`text-[10px] mt-2 ${



                                  mine



                                    ? 'text-purple-200'



                                    : 'text-gray-400'



                                }`}



                              >



                                {new Date(



                                  message.created_at



                                ).toLocaleString('en-GB')}



                              </p>



                            </div>



                          </div>



                        )



                      })



                    )}



                  </div>



                  {['requested', 'negotiating'].includes(



                    hireRequest.status



                  ) ? (



                    <div className="mt-5">



                      <textarea



                        value={messageText}



                        onChange={event =>



                          setMessageText(event.target.value)



                        }



                        maxLength={2000}



                        rows={4}



                        placeholder="For example: Can you review the price for this journey?"



                        className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-300 resize-none"



                      />



                      <div className="flex items-center justify-between gap-3 mt-2">



                        <p className="text-xs text-gray-400">



                          {messageText.length}/2000



                        </p>



                        <button



                          type="button"



                          onClick={sendMessage}



                          disabled={



                            sendingMessage || !messageText.trim()



                          }



                          className="bg-purple-700 text-white px-5 py-3 rounded-2xl font-black disabled:opacity-50"



                        >



                          {sendingMessage



                            ? 'Sending...'



                            : 'Send message'}



                        </button>



                      </div>



                    </div>



                  ) : (



                    <div className="mt-5 bg-gray-50 rounded-2xl p-4 text-sm text-gray-600">



                      Quotation negotiation is now closed for this request.



                    </div>



                  )}



                  {messageError && (



                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-semibold">



                      {messageError}



                    </div>



                  )}



                </section>



              )}



              {/* PAYMENT PROTECTION */}



              <section className="bg-purple-50 border border-purple-200 rounded-[2rem] p-5">



                <p className="text-xs font-black text-purple-700 tracking-widest">



                  PAYMENT PROTECTION



                </p>



                <h3 className="font-black text-lg mt-2">



                  Agree first. Pay securely after.



                </h3>



                <p className="text-sm text-gray-600 mt-2 leading-6">



                  Keep the quotation,



                  negotiation and payment on



                  Fountain Ride. Your booking



                  record will show the final



                  vehicle + driver price you



                  agreed.



                </p>



                <p className="text-xs text-gray-500 mt-3">



                  Do not send payment directly



                  outside Fountain Ride for a



                  vehicle introduced through this



                  request.



                </p>



              </section>



              <button



                type="button"



                onClick={() =>



                  router.push('/cars')



                }



                className="w-full bg-white border px-5 py-4 rounded-2xl font-black"



              >



                + Browse another vehicle



              </button>



            </aside>



          </div>



        </div>



      </main>



    </>



  )



}



function StatusCard({



  status,



  hasOffer,



}: {



  status: string



  hasOffer: boolean



}) {



  let title = words(status)



  let description =



    'Your Vehicle Hire request is active.'



  if (



    status === 'requested' &&



    !hasOffer



  ) {



    title = 'Awaiting quotation'



    description =



      'The vehicle owner can now review your journey and quote.'



  }



  if (



    status === 'requested' &&



    hasOffer



  ) {



    title = 'Quotation received'



    description =



      'Review the vehicle owner’s quotation.'



  }



  if (status === 'negotiating') {



    title = 'Negotiating'



    description =



      'You are discussing the quotation with the vehicle owner.'



  }



  if (



    status === 'fare_agreed' ||



    status === 'awaiting_payment'



  ) {



    title = 'Price agreed'



    description =



      'Complete payment to confirm the vehicle.'



  }



  if (status === 'confirmed') {



    title = 'Booking confirmed'



    description =



      'Your chauffeur-driven vehicle is confirmed.'



  }



  return (



    <div className="bg-white border rounded-2xl px-5 py-4 min-w-[260px]">



      <p className="text-xs font-black text-gray-400 tracking-widest">



        STATUS



      </p>



      <p className="font-black text-lg mt-1">



        {title}



      </p>



      <p className="text-xs text-gray-500 mt-1">



        {description}



      </p>



    </div>



  )



}



function Info({



  label,



  value,



}: {



  label: string



  value: string



}) {



  return (



    <div className="bg-gray-50 rounded-2xl p-4">



      <p className="text-xs font-bold text-gray-500">



        {label}



      </p>



      <p className="font-black mt-1">



        {value || 'Not specified'}



      </p>



    </div>



  )



}



function DarkInfo({



  label,



  value,



}: {



  label: string



  value: string



}) {



  return (



    <div className="bg-white/5 border border-white/10 rounded-2xl p-3">



      <p className="text-[11px] text-gray-400 font-bold">



        {label}



      </p>



      <p className="font-black mt-1">



        {value}



      </p>



    </div>



  )



}



function RoutePoint({



  number,



  label,



  value,



}: {



  number: string



  label: string



  value: string



}) {



  return (



    <div className="flex gap-4">



      <div className="w-10 h-10 shrink-0 rounded-full bg-purple-700 text-white flex items-center justify-center font-black">



        {number}



      </div>



      <div>



        <p className="text-xs font-black text-gray-500">



          {label}



        </p>



        <p className="font-black mt-1">



          {value}



        </p>



      </div>



    </div>



  )



}
