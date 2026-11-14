'use client'
import {useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import MarketplaceNav from '../../components/MarketplaceNav'

export default function RiderRegister(){
 const router=useRouter(),[name,setName]=useState(''),[phone,setPhone]=useState(''),[email,setEmail]=useState(''),[pin,setPin]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function register(){
  setError('');if(pin!==confirm)return setError('The Rider PINs do not match.')
  setBusy(true)
  const r=await fetch('/api/marketplace/rider/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,phone,email,pin})}),d=await r.json()
  if(!r.ok){setError(d.error||'Unable to create account');setBusy(false);return}
  localStorage.setItem('fountain_rider_account_id',d.rider.id);localStorage.setItem('fountain_rider_token',d.accessToken)
  router.push('/rider')
 }
 return <><MarketplaceNav/><main className="min-h-screen bg-[#f7f4fb] p-6"><div className="max-w-xl mx-auto bg-white border rounded-[2rem] p-8 mt-8"><p className="text-purple-700 font-black">CREATE RIDER ACCOUNT</p><h1 className="text-4xl font-black mt-2">Book faster next time.</h1><p className="text-gray-600 mt-3">Your details and ride history will be attached to your Fountain Ride rider account instead of one browser.</p><input className="input mt-6" value={name} onChange={e=>setName(e.target.value)} placeholder="Full name"/><input className="input mt-3" value={phone} onChange={e=>setPhone(e.target.value)} inputMode="tel" placeholder="Mobile number"/><input className="input mt-3" value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email (optional)"/><input className="input mt-3" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" type="password" placeholder="Create 6-digit Rider PIN"/><input className="input mt-3" value={confirm} onChange={e=>setConfirm(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" type="password" placeholder="Confirm Rider PIN"/><button disabled={busy||!name||!phone||pin.length!==6||confirm.length!==6} onClick={register} className="w-full bg-purple-700 text-white p-4 rounded-xl font-black mt-5 disabled:opacity-50">{busy?'Creating account…':'Create rider account'}</button>{error&&<p className="text-red-600 font-bold mt-4">{error}</p>}<p className="text-sm mt-6">Already registered? <Link href="/rider/login" className="text-purple-700 font-black">Sign in</Link></p></div></main></>
}
