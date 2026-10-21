'use client'
import {useEffect,useMemo,useState} from 'react'
import MarketplaceNav from '../../components/MarketplaceNav'
import {money} from '../../../lib/marketplace'

type D={earnings:any[];withdrawals?:any[];wallet?:{withdrawable:number;withdrawalPending?:number}}
export default function DriverWallet(){
 const [data,setData]=useState<D|null>(null),[payout,setPayout]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
 function headers(){return {'x-driver-application-id':localStorage.getItem('fountain_driver_application_id')||'','x-driver-token':localStorage.getItem('fountain_driver_token')||''}}
 useEffect(()=>{Promise.all([fetch('/api/marketplace/driver/dashboard',{headers:headers()}),fetch('/api/marketplace/driver/withdrawals',{headers:headers()})]).then(async([a,b])=>{const da=await a.json(),db=await b.json();if(!a.ok)throw new Error(da.error||'Unable to load wallet');if(!b.ok)throw new Error(db.error||'Unable to load withdrawal balance');
setData({
  ...da,
  wallet:{
    withdrawable:Number(db.availableBalance||0),
    withdrawalPending:Number(db.withdrawalPending||0)
  },
  withdrawals:db.withdrawals||[]
});
setPayout({
  active:db.payoutAccount?{
    bank_name:db.payoutAccount.bank_name,
    account_name:db.payoutAccount.account_name,
    account_number_masked:db.payoutAccount.account_number_masked
  }:null
})}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[])
 const pending=useMemo(()=>data?.earnings?.filter((x:any)=>x.status==='pending').reduce((s:number,x:any)=>s+Number(x.net_amount||0),0)||0,[data]),lifetime=useMemo(()=>data?.earnings?.filter((x:any)=>x.status!=='reversed'&&x.entry_type!=='withdrawal').reduce((s:number,x:any)=>s+Number(x.net_amount||0),0)||0,[data])
 return <><MarketplaceNav/><main className="min-h-screen bg-[#f7f4fb] px-5 py-8"><div className="max-w-5xl mx-auto"><p className="text-purple-700 font-black">DRIVER WALLET</p><h1 className="text-4xl font-black mt-1">Wallet</h1><p className="text-gray-500 mt-2">Earnings, protected trip payments and cashouts in one place.</p>{error&&<div className="mt-5 rounded-2xl bg-red-50 border border-red-200 p-4 font-bold text-red-700">{error}</div>}{loading?<p className="mt-8">Loading walletâ€¦</p>:data&&<><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-7"><Card t="Available" v={money(data.wallet?.withdrawable||0)} s="Ready to cash out"/><Card t="Protected / pending" v={money(pending)} s="Not released yet"/><Card t="Withdrawal pending" v={money(data.wallet?.withdrawalPending||0)} s="Under review or transfer"/><Card t="Lifetime net" v={money(lifetime)} s="After commission"/></div><div className="grid lg:grid-cols-2 gap-4 mt-5"><div className="bg-white border rounded-3xl p-6"><p className="text-xs font-black text-purple-700">PAYOUT ACCOUNT</p>{payout?.active?<><h2 className="text-2xl font-black mt-2">{payout.active.bank_name}</h2><p className="mt-2 font-bold">{payout.active.account_number_masked}</p><p className="text-green-700 font-bold mt-1">âœ“ {payout.active.account_name}</p><p className="text-xs text-gray-500 mt-3">Manage or change your payout account from Driver Home.</p></>:<><h2 className="text-2xl font-black mt-2">No payout account yet</h2><p className="text-gray-500 mt-2">Verify a bank account from Driver Home before your first cashout.</p></>}</div><div className="bg-gray-950 text-white rounded-3xl p-6"><p className="text-xs font-black text-purple-300">PAYMENT PROTECTION</p><h2 className="text-2xl font-black mt-2">Pending trip money stays locked.</h2><p className="text-sm text-gray-300 mt-2">Trip earnings become available only after the protected trip completion flow is satisfied.</p></div></div><h2 className="text-2xl font-black mt-9">Earnings activity</h2><div className="bg-white border rounded-3xl mt-3 overflow-hidden">{!data.earnings?.length?<p className="p-5 text-gray-500">No earnings yet.</p>:data.earnings.slice(0,30).map((e:any)=><div key={e.id} className="p-4 border-b last:border-0 flex justify-between gap-3"><div><b>{money(e.net_amount)}</b><p className="text-xs text-gray-500">Gross {money(e.gross_amount)} Â· Commission {money(e.commission_amount)}</p></div><span className="text-xs font-black uppercase">{e.status}</span></div>)}</div><h2 className="text-2xl font-black mt-9">Cashout history</h2><div className="bg-white border rounded-3xl mt-3 overflow-hidden">{!data.withdrawals?.length?<p className="p-5 text-gray-500">No cashout requests yet.</p>:data.withdrawals.slice(0,30).map((w:any)=><div key={w.id} className="p-4 border-b last:border-0 flex justify-between gap-3"><div><b>{money(w.amount)}</b><p className="text-xs text-gray-500">{w.bank_name} Â· {w.account_number_masked}</p></div><span className="text-xs font-black uppercase">{w.status}</span></div>)}</div></>}</div></main></>
}
function Card({t,v,s}:{t:string;v:string;s:string}){return <div className="bg-white border rounded-3xl p-5"><p className="text-xs font-black text-gray-500">{t}</p><p className="text-2xl font-black mt-2">{v}</p><p className="text-xs text-gray-400 mt-2">{s}</p></div>}
