'use client'
import {useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import MarketplaceNav from '../../components/MarketplaceNav'

export default function RiderLogin(){
 const router=useRouter(),[phone,setPhone]=useState(''),[pin,setPin]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function login(){
  setBusy(true);setError('')
  const r=await fetch('/api/marketplace/rider/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone,pin})}),d=await r.json()
  if(!r.ok){setError(d.error||'Unable to sign in');setBusy(false);return}
  localStorage.setItem('fountain_rider_account_id',d.rider.id);localStorage.setItem('fountain_rider_token',d.accessToken)
  router.push('/rider')
 }
 return <><MarketplaceNav/><main className="min-h-screen bg-[#f7f4fb] p-6"><div className="max-w-xl mx-auto bg-white border rounded-[2rem] p-8 mt-10"><p className="text-purple-700 font-black">RIDER ACCOUNT</p><h1 className="text-4xl font-black mt-2">Welcome back.</h1><p className="text-gray-600 mt-3">Sign in with your mobile number and 6-digit Rider PIN.</p><label className="block mt-6"><b>Mobile number</b><input className="input mt-2" value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" placeholder="0803 000 0000"/></label><label className="block mt-4"><b>6-digit Rider PIN</b><input className="input mt-2" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" type="password" placeholder="••••••"/></label><button disabled={busy||!phone||pin.length!==6} onClick={login} className="w-full bg-purple-700 text-white p-4 rounded-xl font-black mt-5 disabled:opacity-50">{busy?'Signing in…':'Sign in'}</button>{error&&<p className="text-red-600 font-bold mt-4">{error}</p>}<p className="text-sm mt-6">New rider? <Link href="/rider/register" className="text-purple-700 font-black">Create rider account</Link></p></div></main></>
}
