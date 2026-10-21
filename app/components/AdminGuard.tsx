'use client'
import {useEffect,useState} from 'react'
import {useRouter} from 'next/navigation'

export default function AdminGuard({children}:{children:React.ReactNode}){
  const router=useRouter();const[checking,setChecking]=useState(true)
  useEffect(()=>{let alive=true;fetch('/api/admin/session',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(!alive)return;if(!d.authenticated){localStorage.removeItem('fountain_admin_logged_in');router.replace('/admin/login');return}setChecking(false)}).catch(()=>{if(alive)router.replace('/admin/login')});return()=>{alive=false}},[router])
  if(checking)return <main className="min-h-screen bg-[#f7f4fb] flex items-center justify-center px-4"><div className="bg-white rounded-3xl border shadow-sm p-8 text-center"><p className="font-bold text-gray-700">Checking admin access...</p></div></main>
  return <>{children}</>
}
