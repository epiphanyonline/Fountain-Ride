import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../../lib/server/supabaseAdmin'
import { getDriverForToken, getRideForToken, rideToken, driverToken, driverApplicationId } from '../../../../../../lib/server/marketplaceAuth'

const driverTransitions:Record<string,string[]>= {
  confirmed:['driver_en_route','cancelled_by_driver'],
  driver_en_route:['driver_arrived','cancelled_by_driver'],
  driver_arrived:['in_progress','cancelled_by_driver'],
  in_progress:['awaiting_rider_confirmation']
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const body=await req.json().catch(()=>null); const next=String(body?.status||'')
  const rider=await getRideForToken(id,rideToken(req))
  const driver=await getDriverForToken(driverApplicationId(req),driverToken(req))
  if(!rider&&!driver)return NextResponse.json({error:'Unauthorized'},{status:401})
  const db=getSupabaseAdmin()
  const {data:ride,error}=await db.from('ride_requests').select('*').eq('id',id).single()
  if(error||!ride)return NextResponse.json({error:'Ride not found'},{status:404})
  const now=new Date().toISOString()
  const patch:any={status:next,updated_at:now}

  if(rider){
    if(next==='completed'&&ride.status==='awaiting_rider_confirmation'){
      patch.rider_confirmed_at=now
    }else if(next==='disputed'&&['confirmed','driver_en_route','driver_arrived','in_progress','awaiting_rider_confirmation','cancelled_by_driver'].includes(ride.status)){
      patch.refund_requested_at=now;patch.refund_reason=String(body?.reason||'Rider requested Payment Protection review').slice(0,500)
    }else if(next==='cancelled_by_rider'&&['requested','negotiating','awaiting_payment'].includes(ride.status)){
      // Unpaid cancellation.
    }else return NextResponse.json({error:'This rider status change is not allowed.'},{status:409})
  }else if(driver){
    const {data:accepted}=await db.from('ride_offers').select('driver_application_id').eq('id',ride.accepted_offer_id||'00000000-0000-0000-0000-000000000000').maybeSingle()
    if(accepted?.driver_application_id!==driver.id)return NextResponse.json({error:'You are not the selected driver for this trip.'},{status:403})
    if(!driverTransitions[ride.status]?.includes(next))return NextResponse.json({error:'Invalid trip status transition.'},{status:409})
    if(next==='in_progress'){
      const pin=String(body?.tripPin||'').replace(/\D/g,'')
      if(!ride.trip_start_pin||pin!==String(ride.trip_start_pin))return NextResponse.json({error:'Trip PIN is incorrect. Ask the rider for the 4-digit PIN when they are in the vehicle and ready to leave.'},{status:403})
      patch.trip_started_at=now
    }
    if(next==='awaiting_rider_confirmation'){
      patch.driver_completed_at=now
      patch.protection_release_at=new Date(Date.now()+2*60*60*1000).toISOString()
    }
  }

  const {error:updateError}=await db.from('ride_requests').update(patch).eq('id',id)
  if(updateError)return NextResponse.json({error:updateError.message},{status:500})
  await db.from('trip_events').insert({ride_request_id:id,event_type:next,metadata:{role:rider?'rider':'driver',reason:patch.refund_reason||undefined}})
  if(next==='completed')await db.from('driver_earnings').update({status:'available',available_at:now}).eq('ride_request_id',id).eq('status','pending')
  if(next==='disputed'){
    await db.from('ride_disputes').insert({ride_request_id:id,opened_by:ride.rider_id||null,category:'payment_protection',description:patch.refund_reason||'Payment Protection review requested',status:'open'})
  }
  return NextResponse.json({ok:true,status:next})
}
