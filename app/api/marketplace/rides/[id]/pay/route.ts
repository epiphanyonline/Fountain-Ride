import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'
import { getRideForToken, rideToken } from '../../../../../../lib/server/marketplaceAuth'

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const ride=await getRideForToken(id,rideToken(req))
  if(!ride)return NextResponse.json({error:'Unauthorized'},{status:401})
  if(ride.status!=='awaiting_payment'||!ride.agreed_fare)return NextResponse.json({error:'This ride is not awaiting payment.'},{status:409})
  const secret=process.env.PAYSTACK_SECRET_KEY
  if(!secret)return NextResponse.json({error:'Online payment is not configured yet. Add PAYSTACK_SECRET_KEY before enabling payments.'},{status:503})
  const email=ride.rider_email||process.env.PAYSTACK_FALLBACK_EMAIL
  if(!email)return NextResponse.json({error:'An email address is required for online payment.'},{status:400})
  const db=getSupabaseAdmin()
  const reference=`FRPAY-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
  const {error:insertError}=await db.from('marketplace_payments').insert({ride_request_id:id,provider:'paystack',provider_reference:reference,gross_amount:ride.agreed_fare,status:'pending'})
  if(insertError)return NextResponse.json({error:insertError.message},{status:500})
  const site=(process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin).replace(/\/$/,'')
  const response=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify({email,amount:Math.round(Number(ride.agreed_fare)*100),currency:'NGN',reference,callback_url:`${site}/trips/${id}`,metadata:{ride_request_id:id,booking_ref:ride.booking_ref}})})
  const data=await response.json().catch(()=>null)
  if(!response.ok||!data?.status||!data?.data?.authorization_url){
    await db.from('marketplace_payments').update({status:'failed'}).eq('provider_reference',reference)
    return NextResponse.json({error:data?.message||'Unable to initialize payment.'},{status:502})
  }
  return NextResponse.json({authorizationUrl:data.data.authorization_url,reference})
}
