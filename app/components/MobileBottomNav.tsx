'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useEffect,useState} from 'react'

function isDriver(pathname:string){
  if(pathname.startsWith('/driver')) return true
  if(pathname.startsWith('/trips/') && typeof window!=='undefined') return new URLSearchParams(window.location.search).get('as')==='driver'
  return false
}

export default function MobileBottomNav(){
 const p=usePathname(),[driverMode,setDriverMode]=useState(p.startsWith('/driver'))
 useEffect(()=>setDriverMode(isDriver(p)),[p])
 const items=driverMode
  ? [['/driver','⌂','Home'],['/driver/trips','◫','Trips'],['/driver/wallet','₦','Wallet'],['/driver/profile','◉','Profile']]
  : [['/','⌂','Home'],['/book','＋','Book'],['/rider','◫','My Rides'],['/driver','◉','Driver']]
 return <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur px-2 py-2 pb-[max(.5rem,env(safe-area-inset-bottom))]"><div className="grid grid-cols-4 gap-1">{items.map(([href,icon,label])=>{const active=href==='/'?p==='/':p===href||p.startsWith(href+'/');return <Link href={href} key={href} className={`rounded-xl py-2 text-center text-[11px] font-black ${active?'bg-purple-50 text-purple-800':'text-gray-500'}`}><span className="block text-lg leading-none mb-1">{icon}</span>{label}</Link>})}</div></nav>
}
