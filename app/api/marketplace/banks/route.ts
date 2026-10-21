import {NextResponse} from 'next/server'
import {getDriverForToken,driverToken,driverApplicationId} from '../../../../lib/server/marketplaceAuth'

export async function GET(req:Request){
 const driver=await getDriverForToken(driverApplicationId(req),driverToken(req));
 if(!driver)return NextResponse.json({error:'Unauthorized'},{status:401})
 const secret=process.env.PAYSTACK_SECRET_KEY
 if(!secret)return NextResponse.json({error:'Paystack is not configured.'},{status:503})
 try{
  const r=await fetch('https://api.paystack.co/bank?country=nigeria&currency=NGN&perPage=200',{headers:{Authorization:`Bearer ${secret}`},cache:'no-store'})
  const d=await r.json()
  if(!r.ok||!d?.status)return NextResponse.json({error:d?.message||'Unable to load banks.'},{status:502})
  const banks=(d.data||[]).filter((b:any)=>b?.active!==false).map((b:any)=>({name:b.name,code:String(b.code)})).sort((a:any,b:any)=>a.name.localeCompare(b.name))
  return NextResponse.json({banks})
 }catch{return NextResponse.json({error:'Unable to reach Paystack.'},{status:502})}
}
