import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '../../../../lib/server/supabaseAdmin'
import { createAccessToken, hashAccessToken } from '../../../../lib/server/accessTokens'
import { NIGERIA_STATES } from '../../../../lib/marketplace'
import { getRiderForToken } from '../../../../lib/server/marketplaceAuth'
const states=new Set(NIGERIA_STATES)
function ref(){return `FR-${new Date().toISOString().slice(2,10).replaceAll('-','')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`}
export async function POST(req:Request){
 const b=await req.json().catch(()=>null);if(!b)return NextResponse.json({error:'Invalid request'},{status:400})
 const riderAccount=await getRiderForToken(req.headers.get('x-rider-token'))
 const name=String(riderAccount?.full_name||b.name||'').trim(),phone=String(riderAccount?.phone||b.phone||'').trim(),pickup=String(b.pickup||'').trim(),dropoff=String(b.dropoff||'').trim();
 if(!name||!phone||!pickup||!dropoff||!b.date||!b.time)return NextResponse.json({error:'Please complete all required fields.'},{status:400})
 if(!states.has(b.pickupState)||!states.has(b.dropoffState))return NextResponse.json({error:'Invalid state selected.'},{status:400})
 const rideType=b.rideType==='commercial'?'commercial':'private';const commercialMode=rideType==='commercial'?(b.commercialMode==='garage'?'garage':'quick_match'):null
 const parkId=commercialMode==='garage'&&b.parkId?String(b.parkId):null;const driverId=commercialMode==='garage'&&b.driverApplicationId?String(b.driverApplicationId):null
 const passengers=Math.max(1,Math.min(30,Number(b.passengers)||1)),accessToken=createAccessToken(),db=getSupabaseAdmin()
 if(parkId){const {data:park}=await db.from('registered_parks').select('id,verification_status').eq('id',parkId).maybeSingle();if(!park||park.verification_status!=='verified')return NextResponse.json({error:'Selected garage is not available.'},{status:409})}
 if(driverId){const {data:driver}=await db.from('driver_applications').select('id,park_id,verification_status,is_available').eq('id',driverId).maybeSingle();if(!driver||driver.verification_status!=='approved'||!driver.is_available||driver.park_id!==parkId)return NextResponse.json({error:'Selected driver is not available.'},{status:409})}
 const {data,error}=await db.from('ride_requests').insert({booking_ref:ref(),rider_account_id:riderAccount?.id||null,rider_name:name,rider_phone:phone,rider_email:String(riderAccount?.email||b.email||'').trim()||null,pickup_address:pickup,pickup_state:b.pickupState,dropoff_address:dropoff,dropoff_state:b.dropoffState,pickup_date:b.date,pickup_time:b.time,passenger_count:passengers,vehicle_preference:String(b.vehicle||'Any'),notes:String(b.notes||'').trim()||null,booking_for_other:b.traveller==='other',status:'requested',rider_access_hash:hashAccessToken(accessToken),ride_type:rideType,commercial_mode:commercialMode,requested_park_id:parkId,requested_driver_application_id:driverId,pickup_lat:Number.isFinite(Number(b.pickupLat))?Number(b.pickupLat):null,pickup_lng:Number.isFinite(Number(b.pickupLng))?Number(b.pickupLng):null,dropoff_lat:Number.isFinite(Number(b.dropoffLat))?Number(b.dropoffLat):null,dropoff_lng:Number.isFinite(Number(b.dropoffLng))?Number(b.dropoffLng):null}).select('id,booking_ref').single()
 if(error)return NextResponse.json({error:error.message},{status:500})
 if(driverId)await db.from('ride_driver_invites').insert({ride_request_id:data.id,driver_application_id:driverId,status:'invited'})
 return NextResponse.json({...data,accessToken},{status:201})
}
