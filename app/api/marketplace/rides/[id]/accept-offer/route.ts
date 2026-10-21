import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'
import { getRideForToken, rideToken } from '../../../../../../lib/server/marketplaceAuth'

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const ride=await getRideForToken(id,rideToken(req))
  if(!ride)return NextResponse.json({error:'Unauthorized'},{status:401})
  if(!['requested','negotiating'].includes(ride.status))return NextResponse.json({error:'A fare can no longer be selected for this ride.'},{status:409})
  const body=await req.json().catch(()=>null); const offerId=String(body?.offerId||'')
  const db=getSupabaseAdmin()
  const {data:offer,error}=await db.from('ride_offers').select('*').eq('id',offerId).eq('ride_request_id',id).single()
  if(error||!offer||offer.status!=='offered')return NextResponse.json({error:'Offer is not available.'},{status:404})
  const {data:driver}=await db.from('driver_applications').select('verification_status').eq('id',offer.driver_application_id).single()
  if(driver?.verification_status!=='approved')return NextResponse.json({error:'This driver is not currently approved.'},{status:409})
  const now=new Date().toISOString()
  const update=await db.from('ride_requests').update({status:'awaiting_payment',agreed_fare:offer.amount,accepted_offer_id:offer.id,updated_at:now}).eq('id',id).in('status',['requested','negotiating'])
  if(update.error)return NextResponse.json({error:update.error.message},{status:500})
  await db.from('ride_offers').update({status:'closed'}).eq('ride_request_id',id).neq('id',offer.id)
  await db.from('ride_offers').update({status:'accepted'}).eq('id',offer.id)
  await db.from('trip_events').insert({ride_request_id:id,event_type:'fare_accepted',metadata:{offer_id:offer.id,amount:offer.amount}})
  return NextResponse.json({ok:true,status:'awaiting_payment',amount:offer.amount})
}
