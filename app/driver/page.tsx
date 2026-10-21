'use client'
import {useEffect,useMemo,useState} from 'react'
import Link from 'next/link'
import {money} from '../../lib/marketplace'
import MarketplaceNav from '../components/MarketplaceNav'
type Dashboard={driver:any;requests:any[];driverHireRequests?:any[];driverHireUnreadMessageCount?:number;earnings:any[];offers:any[];withdrawals?:any[];wallet?:{withdrawable:number;withdrawalPending?:number};reputation?:any;matching?:{mode:string;radiusKm:number}|null;walletPinSet?:boolean;capabilities?:any}
export default function Driver(){
 const [data,setData]=useState<Dashboard|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[locating,setLocating]=useState(false),[notice,setNotice]=useState(''),[payout,setPayout]=useState<any>(null),[payoutOpen,setPayoutOpen]=useState(false),[cashoutOpen,setCashoutOpen]=useState(false),[pinOpen,setPinOpen]=useState(false),[banks,setBanks]=useState<any[]>([]),[bank,setBank]=useState({bankCode:'',bankName:'',accountNumber:'',pin:''}),[verifiedName,setVerifiedName]=useState(''),[amount,setAmount]=useState(''),[walletPin,setWalletPin]=useState(''),[currentPin,setCurrentPin]=useState(''),[busy,setBusy]=useState(false),[bankSearch,setBankSearch]=useState('')
 function authHeaders(){const applicationId=localStorage.getItem('fountain_driver_application_id')||'',token=localStorage.getItem('fountain_driver_token')||'';return {'x-driver-application-id':applicationId,'x-driver-token':token}}
 async function load(){
  const {
    ['x-driver-application-id']:applicationId,
    ['x-driver-token']:token
  }=authHeaders()

  if(!applicationId||!token){
    setLoading(false)
    return
  }

  try{
    const headers=authHeaders()

    const [r,p,h]=await Promise.all([
      fetch('/api/marketplace/driver/dashboard',{headers}),
      fetch('/api/marketplace/driver/payout-account',{headers}),
      fetch('/api/marketplace/driver/hire-jobs',{headers})
    ])

    const d=await r.json()
    const pd=await p.json()
    const hd=await h.json()

    if(!r.ok){
      throw new Error(d.error||'Unable to load driver dashboard')
    }

    /*
     * Driver Hire is an additional marketplace.
     * A Driver Hire API problem must not break
     * the existing passenger-trip dashboard.
     */
    d.driverHireRequests=
  h.ok&&Array.isArray(hd.jobs)
    ? hd.jobs
    : []

d.driverHireUnreadMessageCount=
  h.ok
    ? Number(hd.unread_message_count||0)
    : 0

setData(d)

    if(p.ok){
      setPayout(pd)
    }

    setError('')
  }catch(e:any){
    setError(e.message)
  }finally{
    setLoading(false)
  }
}
 useEffect(()=>{load()},[])
 useEffect(()=>{if(payoutOpen&&banks.length===0)fetch('/api/marketplace/banks',{headers:authHeaders()}).then(r=>r.json()).then(d=>setBanks(d.banks||[])).catch(()=>{})},[payoutOpen,banks.length])
 const pending=useMemo(()=>data?.earnings.filter(x=>x.status==='pending').reduce((s,x)=>s+Number(x.net_amount||0),0)||0,[data]),lifetime=useMemo(()=>data?.earnings.filter(x=>x.status!=='reversed'&&x.entry_type!=='withdrawal').reduce((s,x)=>s+Number(x.net_amount||0),0)||0,[data]),withdrawable=Number(data?.wallet?.withdrawable||0),withdrawalPending=Number(data?.wallet?.withdrawalPending||0)
 function shareLocation(){if(!navigator.geolocation||!data)return;setLocating(true);navigator.geolocation.getCurrentPosition(async p=>{await fetch('/api/marketplace/driver/location',{method:'POST',headers:{...authHeaders(),'content-type':'application/json'},body:JSON.stringify({lat:p.coords.latitude,lng:p.coords.longitude})}).catch(()=>{});setLocating(false);load()},()=>setLocating(false),{enableHighAccuracy:true,timeout:10000})}
 async function savePin(){setBusy(true);setError('');const r=await fetch('/api/marketplace/driver/security',{method:'POST',headers:{...authHeaders(),'content-type':'application/json'},body:JSON.stringify({pin:walletPin,currentPin})}),d=await r.json();if(!r.ok)setError(d.error||'Unable to update PIN');else{setPinOpen(false);setWalletPin('');setCurrentPin('');setNotice(data?.walletPinSet?'Wallet PIN changed.':'Wallet PIN created.');await load()}setBusy(false)}
 async function verifyBank(){setBusy(true);setVerifiedName('');setError('');const r=await fetch('/api/marketplace/driver/verify-bank',{method:'POST',headers:{...authHeaders(),'content-type':'application/json'},body:JSON.stringify({bankCode:bank.bankCode,accountNumber:bank.accountNumber})}),d=await r.json();if(r.ok)setVerifiedName(d.accountName||'');else setError(d.error||'Unable to verify account');setBusy(false)}
 async function savePayout(){setBusy(true);setError('');const r=await fetch('/api/marketplace/driver/payout-account',{method:'POST',headers:{...authHeaders(),'content-type':'application/json'},body:JSON.stringify(bank)}),d=await r.json();if(!r.ok)setError(d.error||'Unable to save payout account');else{setPayoutOpen(false);setBank({bankCode:'',bankName:'',accountNumber:'',pin:''});setVerifiedName('');setNotice(d.securityHold?'New payout account verified. Cashouts are paused for 24 hours before it becomes active.':'Payout account verified and saved. Future cashouts will use it automatically.');await load()}setBusy(false)}
 async function cashout(){setBusy(true);setError('');const r=await fetch('/api/marketplace/driver/withdrawals',{method:'POST',headers:{...authHeaders(),'content-type':'application/json'},body:JSON.stringify({amount:Number(amount),pin:walletPin})}),d=await r.json();if(!r.ok)setError(d.error||'Unable to request cashout');else{setCashoutOpen(false);setAmount('');setWalletPin('');setNotice('Cashout requested. Fountain Ride will review the transfer and update your wallet status.');await load()}setBusy(false)}
 async function setAvailability(field:string,value:boolean){setBusy(true);setError('');const r=await fetch('/api/marketplace/driver/availability',{method:'POST',headers:{...authHeaders(),'content-type':'application/json'},body:JSON.stringify({[field]:value})}),d=await r.json();if(!r.ok)setError(d.error||'Unable to update availability');else{setNotice(value?'You are now available for this type of work.':'Availability switched off.');await load()}setBusy(false)}
 if(loading)return <><MarketplaceNav/><main className="p-8">Loading driver centre…</main></>;if(!data)return <><MarketplaceNav/><main className="min-h-screen bg-[#f7f4fb] p-6"><div className="max-w-2xl mx-auto bg-white border rounded-[2rem] p-8"><h1 className="text-3xl font-black">Driver centre</h1><p className="text-gray-600 mt-3">Securely register or sign back into your Fountain Ride driver account.</p>{error&&<p className="text-red-600 mt-3">{error}</p>}<div className="flex gap-2 mt-5"><Link href="/driver/register" className="bg-purple-700 text-white px-6 py-3 rounded-xl font-bold">Register</Link><Link href="/driver/login" className="border px-6 py-3 rounded-xl font-bold">Sign in</Link></div></div></main></>
 const approved=data.driver.verification_status==='approved',rep=data.reputation||{average_rating:0,review_count:0,completed_trips:0},activePayout=payout?.active,pendingPayout=payout?.pending
 const rawCap=data.capabilities||{workMode:'passenger_trips',passengerTrips:true,driverHire:false,passengerTripAvailable:data.driver.is_available!==false,driverHireAvailable:false,driverHireApproved:false},cap={...rawCap,driverHireAvailable:approved&&rawCap.driverHireApproved===true&&rawCap.driverHireAvailable===true},hireJobs=Array.isArray(data.driver.driver_hire_job_types)?data.driver.driver_hire_job_types:[]
 return <><MarketplaceNav/><main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f0e5ff,#f8f5fb_42%)] p-5 py-9"><div className="max-w-6xl mx-auto"><div className="flex flex-col md:flex-row md:justify-between gap-4 md:items-end"><div><p className="text-purple-700 font-black">Driver centre</p><h1 className="text-4xl font-black mt-1">Welcome, {data.driver.full_name}</h1><p className="text-sm text-gray-500 mt-2">{data.driver.vehicle_make} {data.driver.vehicle_model} · {data.driver.vehicle_plate}{data.driver.driver_type==='commercial'&&data.driver.park_name?` · ${data.driver.park_name}`:''}</p><div className="flex flex-wrap gap-3 mt-3 text-sm font-bold"><span className="text-amber-700">{rep.average_rating?`★ ${Number(rep.average_rating).toFixed(1)}`:'New rating'}</span><span>{rep.review_count} verified reviews</span><span>{rep.completed_trips} completed trips</span></div></div><div className="flex gap-2 flex-wrap"><Link href="/driver/trips" className="border bg-white px-4 py-3 rounded-xl font-bold">Trips</Link><Link href="/driver/wallet" className="border bg-white px-4 py-3 rounded-xl font-bold">Wallet</Link><Link href="/driver/profile" className="border bg-white px-4 py-3 rounded-xl font-bold">Profile</Link><button onClick={shareLocation} className="border bg-white px-4 py-3 rounded-xl font-bold">{locating?'Locating…':'◎ Update location'}</button><button onClick={()=>setPinOpen(true)} className="border bg-white px-4 py-3 rounded-xl font-bold">{data.walletPinSet?'Change Wallet PIN':'Secure wallet'}</button></div></div>
 {notice&&<div className="mt-5 rounded-2xl bg-green-50 border border-green-200 p-4 font-bold text-green-800">{notice}</div>}{error&&<div className="mt-5 rounded-2xl bg-red-50 border border-red-200 p-4 font-bold text-red-700">{error}</div>}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-7">
  <Card
    t="Available Hire Jobs"
    v={String((data.driverHireRequests || []).length)}
    sub="Driver Hire opportunities"
  />
  <Card
    t="New Messages"
    v={String(data.driverHireUnreadMessageCount || 0)}
    sub="Unread Driver Hire messages"
  />
  <Card
    t="Available Balance"
    v={money(withdrawable)}
    sub="Ready to withdraw"
  />
  <Card
    t="Lifetime Earnings"
    v={money(lifetime)}
    sub="Net earnings after commission"
  />
</div>
 <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-4 mt-5"><div className="bg-gray-950 text-white rounded-3xl p-6"><p className="text-xs font-black tracking-widest text-purple-300">DRIVER GROWTH</p><h2 className="text-2xl font-black mt-2">Your reputation is becoming an asset.</h2><p className="text-sm text-gray-300 mt-2">Verified trips, ratings and reliable service build your future maintenance and vehicle-upgrade eligibility.</p><div className="flex gap-3 mt-5 flex-wrap"><span className="bg-white/10 px-5 py-3 rounded-2xl text-lg font-black">★ {rep.average_rating?Number(rep.average_rating).toFixed(1):'New'}</span><span className="bg-white/10 px-5 py-3 rounded-2xl text-lg font-black">{rep.completed_trips} completed trips</span></div></div><div className="bg-white border rounded-3xl p-6"><p className="text-xs font-black text-purple-700">SECURE PAYOUT</p><h2 className="text-2xl font-black mt-1">{activePayout?'Saved payout account':'Set up payout account'}</h2>{activePayout?<><p className="font-black mt-3">{activePayout.bank_name} · {activePayout.account_number_masked}</p><p className="text-sm text-green-700 font-bold mt-1">✓ {activePayout.account_name}</p><button onClick={()=>setPayoutOpen(true)} className="border w-full mt-4 p-3 rounded-xl font-black">Change payout account</button></>:<button onClick={()=>setPayoutOpen(true)} className="bg-purple-700 text-white w-full mt-4 p-3 rounded-xl font-black">Verify payout account</button>}{pendingPayout&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3 text-sm"><b>Bank change security hold</b><p>{pendingPayout.bank_name} · {pendingPayout.account_number_masked}</p><p className="text-xs mt-1">Cashouts resume after {new Date(pendingPayout.available_from).toLocaleString()}.</p></div>}<button disabled={withdrawable<=0||!activePayout||!!pendingPayout||!data.walletPinSet} onClick={()=>{setAmount(String(withdrawable));setWalletPin('');setCashoutOpen(true)}} className="w-full mt-3 bg-green-600 text-white p-3 rounded-xl font-black disabled:bg-gray-200 disabled:text-gray-500">Cash out {withdrawable>0?money(withdrawable):''}</button></div></div>
 <section className="mt-6 bg-white border rounded-3xl p-6"><p className="text-xs font-black tracking-widest text-purple-700">WORK AVAILABILITY</p><h2 className="text-2xl font-black mt-1">Choose the work you are available for.</h2><p className="text-sm text-gray-500 mt-2">Passenger Trips and Driver Hire are independent.</p><div className="grid md:grid-cols-2 gap-4 mt-5">{cap.passengerTrips&&<div className="border rounded-2xl p-5"><div className="flex justify-between"><div><p className="text-2xl">🚘</p><h3 className="text-lg font-black">Passenger Trips</h3></div><b>{cap.passengerTripAvailable?'ON':'OFF'}</b></div><button disabled={busy||!approved} onClick={()=>setAvailability('passenger_trip_available',!cap.passengerTripAvailable)} className="w-full mt-4 border p-3 rounded-xl font-black disabled:opacity-50">{cap.passengerTripAvailable?'Pause Passenger Trips':'Go available for Passenger Trips'}</button></div>}{cap.driverHire&&<div className="border rounded-2xl p-5"><div className="flex justify-between"><div><p className="text-2xl">👨🏾‍✈️</p><h3 className="text-lg font-black">Driver Hire</h3></div><b>{cap.driverHireAvailable?'ON':'OFF'}</b></div><div className="text-sm mt-3"><p><b>Hire verification:</b> {cap.driverHireApproved?'Approved ✓':'Pending'}</p>{data.driver.driving_experience_years!=null&&<p><b>Experience:</b> {data.driver.driving_experience_years} years</p>}<p><b>Transmission:</b> {[data.driver.drives_automatic?'Automatic':null,data.driver.drives_manual?'Manual':null].filter(Boolean).join(' · ')}</p>{hireJobs.length>0&&<p><b>Interested in:</b> {hireJobs.map((x:string)=>x.replaceAll('_',' ')).join(' · ')}</p>}</div><button disabled={busy||!approved||!cap.driverHireApproved} onClick={()=>setAvailability('driver_hire_available',!cap.driverHireAvailable)} className="w-full mt-4 border p-3 rounded-xl font-black disabled:opacity-50">{cap.driverHireAvailable?'Pause Driver Hire':'Go available for Driver Hire'}</button>{!cap.driverHireApproved&&<p className="text-xs text-amber-700 mt-2">Driver Hire must be approved before you can receive hire jobs.</p>}</div>}</div></section>{!approved&&<div className="mt-6 bg-amber-50 border border-amber-200 rounded-3xl p-5"><b>Driver verification pending</b><p className="text-sm mt-1">Your secure account is active. Trip opportunities appear after Fountain Ride approves the driver profile.</p></div>}
 {approved&&cap.driverHire&&
<section className="mt-9">

  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">

    <div>
      <p className="text-sm font-black text-purple-700">
        DRIVER HIRE MARKETPLACE
      </p>

      <h2 className="text-3xl font-black">
        Driver Hire opportunities
      </h2>

      <p className="text-sm text-gray-500 mt-1">
        Review suitable customer requests and decide which jobs you want to quote for.
      </p>
    </div>

    <div className="flex flex-wrap gap-2 items-center">

      {Number(data.driverHireUnreadMessageCount||0)>0&&
        <span className="text-sm font-black px-4 py-2 rounded-full bg-red-50 text-red-700 border border-red-200">
          💬 {data.driverHireUnreadMessageCount} new {Number(data.driverHireUnreadMessageCount)===1?'message':'messages'}
        </span>
      }

      <span
        className={`text-xs font-black px-3 py-2 rounded-full ${
          cap.driverHireAvailable
            ?'bg-green-50 text-green-700'
            :'bg-gray-100 text-gray-600'
        }`}
      >
        {cap.driverHireAvailable
          ?'Available for Driver Hire'
          :'Driver Hire paused'}
      </span>

    </div>
  </div>

  {!cap.driverHireApproved?

    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mt-4">
      <b>Driver Hire verification required</b>

      <p className="text-sm mt-1">
        Fountain Ride must approve your Driver Hire profile before hire opportunities can appear.
      </p>
    </div>

  :!cap.driverHireAvailable?

    <div className="bg-white border rounded-3xl p-6 mt-4">
      <b>
        You are not currently receiving Driver Hire jobs.
      </b>

      <p className="text-sm text-gray-500 mt-1">
        Use “Go available for Driver Hire” above when you are ready to receive customer requests.
      </p>
    </div>

  :

    <div className="grid md:grid-cols-2 gap-4 mt-4">

      {(data.driverHireRequests||[]).length===0?

        <div className="bg-white border rounded-3xl p-6 text-gray-500 md:col-span-2">
          No matching Driver Hire requests right now.
        </div>

      :

        (data.driverHireRequests||[]).map((r:any)=>{

          const unreadCount=
            Number(r.unread_message_count||0)

          const latestMessage=
            r.latest_customer_message

          return (
            <div
              key={r.id}
              className={`bg-white rounded-3xl p-5 shadow-sm ${
                unreadCount>0
                  ?'border-2 border-purple-300'
                  :'border'
              }`}
            >

              <div className="flex items-start justify-between gap-3">

                <div>
                  <p className="text-xs font-black tracking-wider text-purple-700">
                    {r.booking_ref||'DRIVER HIRE'}
                  </p>

                  <h3 className="text-xl font-black mt-1">
                    {label(r.driver_need_type||r.job_type||'Driver hire')}
                  </h3>
                </div>

                <span
                  className={`text-xs font-black px-2 py-1 rounded-full ${
                    r.matches_interest===false
                      ?'bg-gray-100 text-gray-600'
                      :'bg-green-50 text-green-700'
                  }`}
                >
                  {r.matches_interest===false
                    ?'Other opportunity'
                    :'Matches interests'}
                </span>

              </div>

              {unreadCount>0&&
                <div className="mt-4 rounded-2xl bg-purple-50 border border-purple-200 p-4">

                  <div className="flex items-center justify-between gap-3">

                    <p className="text-sm font-black text-purple-800">
                      💬 New message from customer
                    </p>

                    <span className="shrink-0 bg-purple-700 text-white text-xs font-black px-2.5 py-1 rounded-full">
                      {unreadCount} unread
                    </span>

                  </div>

                  {latestMessage?.body&&
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                      “{latestMessage.body}”
                    </p>
                  }

                </div>
              }

              <div className="mt-4 space-y-2 text-sm">

                <p>
                  <b>Work area:</b>{' '}
                  {r.public_work_area||
                    [r.pickup_city,r.pickup_state]
                      .filter(Boolean)
                      .join(', ')||
                    'Not specified'}
                </p>

                <p>
                  <b>When:</b>{' '}
                  {formatHireDate(r.start_date)}
                  {r.start_time
                    ?` · ${shortTime(r.start_time)}`
                    :''}
                </p>

                <p>
                  <b>Arrangement:</b>{' '}
                  {label(r.service_frequency||r.job_type||'one_time')}
                  {r.recurring_pattern
                    ?` · ${label(r.recurring_pattern)}`
                    :''}
                </p>

                {(r.vehicle_make||
                  r.vehicle_model||
                  r.vehicle_type||
                  r.vehicle_transmission)&&
                  <p>
                    <b>Vehicle:</b>{' '}
                    {[
                      r.vehicle_make,
                      r.vehicle_model,
                      r.vehicle_year,
                      label(r.vehicle_type),
                      label(r.vehicle_transmission)
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                }

                {Array.isArray(r.duties)&&
                  r.duties.length>0&&
                  <p>
                    <b>Duties:</b>{' '}
                    {r.duties
                      .map((x:string)=>label(x))
                      .join(' · ')}
                  </p>
                }

                <div className="flex flex-wrap gap-2 pt-1">

                  {r.interstate_required&&
                    <Tag>Interstate</Tag>
                  }

                  {r.overnight_required&&
                    <Tag>Overnight</Tag>
                  }

                  {r.waiting_expected&&
                    <Tag>
                      {r.estimated_waiting_hours
                        ?`Waiting ~${r.estimated_waiting_hours}h`
                        :'Waiting expected'}
                    </Tag>
                  }

                  {r.passenger_count!=null&&
                    <Tag>
                      {r.passenger_count} passenger
                      {Number(r.passenger_count)===1?'':'s'}
                    </Tag>
                  }

                </div>

              </div>

              {r.my_offer?

                <div className="mt-4 rounded-2xl bg-purple-50 border border-purple-100 p-3">

                  <p className="text-xs font-black text-purple-700">
                    YOUR CURRENT QUOTATION
                  </p>

                  <div className="flex justify-between gap-3 mt-1">

                    <b>
                      {money(
                        Number(
                          r.my_offer.base_amount??
                          r.my_offer.amount??
                          0
                        )
                      )}
                    </b>

                    <span className="text-xs font-black uppercase">
                      {label(r.my_offer.status)}
                    </span>

                  </div>

                </div>

              :

                <p className="text-xs text-gray-500 mt-4">
                  You have not submitted a quotation for this request.
                </p>
              }

              <Link
                href={`/driver/hire-jobs/${r.id}`}
                className={`block w-full text-center text-white p-3 rounded-xl font-black mt-4 ${
                  unreadCount>0
                    ?'bg-purple-800'
                    :'bg-purple-700'
                }`}
              >
                {unreadCount>0
                  ?`View Job & Reply (${unreadCount})`
                  :'View Job'}
              </Link>

            </div>
          )
        })
      }

    </div>
  }

</section>
}

 {approved&&cap.passengerTrips&&<><div className="flex items-end justify-between mt-9"><div><p className="text-sm font-black text-purple-700">Marketplace</p><h2 className="text-3xl font-black">Trip opportunities</h2></div><span className="text-xs text-gray-500">{data.matching?.mode==='distance'?`Showing requests within about ${data.matching.radiusKm} km first.`:'Share your location for true nearby Quick Match.'}</span></div><div className="grid md:grid-cols-2 gap-4 mt-4">{data.requests.length===0?<Empty/>:data.requests.map(r=><Link href={`/trips/${r.id}?as=driver`} key={r.id} className="fr-choice bg-white border rounded-3xl p-5"><div className="flex justify-between gap-2"><b>{r.ride_type==='commercial'?(r.commercial_mode==='garage'?'Mobile Garage™':'Commercial quick match'):'Private request'}</b><span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">{r.rider_verified?'Verified rider ✓':'Not verified'}</span></div><p className="font-black text-xl mt-3">{r.pickup_address} → {r.dropoff_address}</p><p className="text-sm text-gray-500 mt-2">{r.pickup_date} · {r.pickup_time}</p></Link>)}</div></>}
 <h2 className="text-2xl font-black mt-10">Recent wallet activity</h2><div className="bg-white border rounded-3xl mt-4 overflow-hidden">{data.earnings.length===0?<p className="p-5 text-gray-500">Paid trip earnings will appear here.</p>:data.earnings.slice(0,8).map(e=><div key={e.id} className="p-4 border-b last:border-b-0 flex justify-between"><div><b>{money(e.net_amount)}</b><p className="text-xs text-gray-500">Gross {money(e.gross_amount)} · Commission {money(e.commission_amount)}</p></div><span className="text-xs font-black capitalize">{e.status}</span></div>)}</div>{(data.withdrawals||[]).length>0&&<><h2 className="text-2xl font-black mt-8">Cashout requests</h2><div className="bg-white border rounded-3xl mt-4 overflow-hidden">{(data.withdrawals||[]).slice(0,8).map((w:any)=><div key={w.id} className="p-4 border-b last:border-0 flex justify-between"><div><b>{money(w.amount)}</b><p className="text-xs text-gray-500">{w.bank_name} · {w.account_number_masked}</p></div><span className="text-xs font-black uppercase">{w.status}</span></div>)}</div></>}</div></main>
 {pinOpen&&<Modal close={()=>setPinOpen(false)} title={data.walletPinSet?'Change Wallet PIN':'Create Wallet PIN'}>{data.walletPinSet&&<input className="input" value={currentPin} onChange={e=>setCurrentPin(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Current 6-digit PIN" inputMode="numeric"/>}<input className="input mt-3" value={walletPin} onChange={e=>setWalletPin(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="New 6-digit PIN" inputMode="numeric"/><button disabled={busy||walletPin.length!==6||(data.walletPinSet&&currentPin.length!==6)} onClick={savePin} className="w-full bg-purple-700 text-white p-4 rounded-xl font-black mt-4 disabled:opacity-50">Save Wallet PIN</button></Modal>}
 {payoutOpen&&<Modal close={()=>setPayoutOpen(false)} title={activePayout?'Change payout account':'Verify payout account'}><div><input className="input" value={bankSearch} onChange={e=>setBankSearch(e.target.value)} placeholder="Search bank — e.g. G or GTBank" autoComplete="off"/>{bankSearch&&<div className="mt-2 max-h-48 overflow-y-auto border rounded-xl bg-white">{banks.filter((b:any)=>String(b.name||'').toLowerCase().includes(bankSearch.toLowerCase())).slice(0,12).map((b:any,i:number)=><button type="button" key={`${b.code}-${b.name}-${i}`} onClick={()=>{setBank({bankCode:b.code,bankName:b.name,accountNumber:bank.accountNumber,pin:bank.pin});setBankSearch(b.name);setVerifiedName('')}} className={`w-full text-left px-4 py-3 border-b last:border-0 hover:bg-purple-50 ${bank.bankCode===b.code?'bg-purple-50 font-black':''}`}>{b.name}</button>)}</div>}{bank.bankName&&<p className="text-xs font-bold text-purple-700 mt-2">Selected: {bank.bankName}</p>}</div><div className="flex gap-2 mt-3"><input className="input flex-1" value={bank.accountNumber} onChange={e=>{setBank(p=>({...p,accountNumber:e.target.value.replace(/\D/g,'').slice(0,10)}));setVerifiedName('')}} placeholder="10-digit account number" inputMode="numeric"/><button onClick={verifyBank} disabled={busy||!bank.bankCode||bank.accountNumber.length!==10} className="border px-4 rounded-xl font-black">Verify</button></div>{verifiedName&&<div className="bg-green-50 border border-green-200 p-3 rounded-xl mt-3"><p className="text-xs font-black text-green-700">VERIFIED ACCOUNT</p><b>{verifiedName}</b></div>}<input className="input mt-3" value={bank.pin} onChange={e=>setBank(p=>({...p,pin:e.target.value.replace(/\D/g,'').slice(0,6)}))} placeholder="Wallet PIN" inputMode="numeric"/><button disabled={busy||!verifiedName||bank.pin.length!==6} onClick={savePayout} className="w-full bg-green-600 text-white p-4 rounded-xl font-black mt-4 disabled:opacity-50">Save verified payout account</button>{activePayout&&<p className="text-xs text-amber-700 mt-3">Changing a saved payout account creates a 24-hour security hold before cashouts resume.</p>}</Modal>}
 {cashoutOpen&&<Modal close={()=>setCashoutOpen(false)} title="Request cashout"><p className="text-sm text-gray-500 mb-3">Pay to <b>{activePayout?.bank_name} {activePayout?.account_number_masked}</b> · {activePayout?.account_name}</p><input className="input" type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount ₦"/><input className="input mt-3" value={walletPin} onChange={e=>setWalletPin(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Wallet PIN" inputMode="numeric"/><button disabled={busy||!amount||walletPin.length!==6} onClick={cashout} className="w-full bg-green-600 text-white p-4 rounded-xl font-black mt-4 disabled:opacity-50">Confirm cashout</button></Modal>}
 </>
}

function label(value:any){
 const s=String(value??'').replaceAll('_',' ').trim()
 return s?s.replace(/\b\w/g,(c:string)=>c.toUpperCase()):''
}
function formatHireDate(value:any){
 if(!value)return 'Date not specified'
 const d=new Date(`${value}T00:00:00`)
 return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})
}
function shortTime(value:any){
 const s=String(value??'')
 return s.length>=5?s.slice(0,5):s
}
function Tag({children}:{children:any}){return <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded-full">{children}</span>}

function Modal({close,title,children}:{close:()=>void;title:string;children:any}){return <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center" onClick={close}><div className="bg-white rounded-[2rem] p-6 w-full max-w-lg" onClick={e=>e.stopPropagation()}><div className="flex justify-between"><h2 className="text-3xl font-black">{title}</h2><button onClick={close} className="text-2xl">×</button></div><div className="mt-5">{children}</div></div></div>}
function Card({t,v,sub}:{t:string;v:string;sub:string}){return <div className="fr-glass border rounded-3xl p-5 shadow-sm"><p className="text-xs font-black text-gray-500">{t}</p><p className="text-2xl font-black mt-2">{v}</p><p className="text-xs text-gray-400 mt-2">{sub}</p></div>}
function Empty(){return <div className="bg-white border rounded-3xl p-6 text-gray-500">No open requests right now.</div>}
