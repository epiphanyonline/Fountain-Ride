'use client'
import {Suspense,useEffect,useState} from 'react'
import {useRouter,useSearchParams} from 'next/navigation'
import MarketplaceNav from '../../components/MarketplaceNav'
function ClaimContent(){const q=useSearchParams(),router=useRouter(),id=q.get('driver')||'',token=q.get('token')||'',[driver,setDriver]=useState<any>(null),[loginPin,setLoginPin]=useState(''),[loginPin2,setLoginPin2]=useState(''),[walletPin,setWalletPin]=useState(''),[walletPin2,setWalletPin2]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false)
 useEffect(()=>{fetch(`/api/marketplace/driver/claim?driver=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setDriver(d.driver)}).catch(e=>setErr(e.message))},[id,token])
 const ready=loginPin.length===6&&walletPin.length===6&&loginPin===loginPin2&&walletPin===walletPin2&&loginPin!==walletPin
 async function activate(){setBusy(true);setErr('');if(loginPin!==loginPin2){setErr('Driver PINs do not match.');setBusy(false);return}if(walletPin!==walletPin2){setErr('Wallet PINs do not match.');setBusy(false);return}if(loginPin===walletPin){setErr('Use a different Wallet PIN from your Driver PIN.');setBusy(false);return}const r=await fetch('/api/marketplace/driver/claim',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({driverId:id,token,loginPin,walletPin})}),d=await r.json();if(!r.ok){setErr(d.error||'Unable to activate');setBusy(false);return}localStorage.setItem('fountain_driver_application_id',d.applicationId);localStorage.setItem('fountain_driver_token',d.accessToken);router.push('/driver')}
 const clean=(v:string)=>v.replace(/\D/g,'').slice(0,6)
 return <><MarketplaceNav/><main className="min-h-screen bg-[#f7f4fb] p-6"><div className="max-w-xl mx-auto bg-white border rounded-[2rem] p-8 mt-10"><p className="text-purple-700 font-black">Secure driver setup</p><h1 className="text-4xl font-black mt-2">Create your private access.</h1>{driver&&<div className="bg-purple-50 border rounded-2xl p-4 mt-5"><b>{driver.full_name}</b><p className="text-sm mt-1">{driver.phone}</p><p className="text-sm">{driver.vehicle_make} {driver.vehicle_model} · {driver.vehicle_plate}</p></div>}<div className="mt-6 border rounded-2xl p-5"><b>1. Create your 6-digit Driver PIN</b><p className="text-xs text-gray-500 mt-1">Use this with your mobile number when signing in.</p><input value={loginPin} onChange={e=>setLoginPin(clean(e.target.value))} className="input mt-3" inputMode="numeric" type="password" placeholder="••••••"/><input value={loginPin2} onChange={e=>setLoginPin2(clean(e.target.value))} className="input mt-2" inputMode="numeric" type="password" placeholder="Confirm Driver PIN"/></div><div className="mt-4 border rounded-2xl p-5"><b>2. Create a different 6-digit Wallet PIN</b><p className="text-xs text-gray-500 mt-1">Required for cashouts and payout-account changes. Fountain Ride cannot see it.</p><input value={walletPin} onChange={e=>setWalletPin(clean(e.target.value))} className="input mt-3" inputMode="numeric" type="password" placeholder="••••••"/><input value={walletPin2} onChange={e=>setWalletPin2(clean(e.target.value))} className="input mt-2" inputMode="numeric" type="password" placeholder="Confirm Wallet PIN"/></div><button disabled={busy||!driver||!ready} onClick={activate} className="w-full bg-purple-700 text-white p-4 rounded-xl font-black mt-5 disabled:opacity-50">{busy?'Securing account…':'Secure & activate my account'}</button>{!ready&&driver&&<p className="text-xs text-gray-500 mt-3">Both PINs must be 6 digits, confirmed, and different from each other.</p>}{err&&<p className="text-red-600 mt-4 font-bold">{err}</p>}</div></main></>}
export default function Claim(){
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-bold text-purple-700">Loading Fountain Ride...</p>
      </main>
    }>
      <ClaimContent />
    </Suspense>
  )
}
