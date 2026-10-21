import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../lib/server/supabaseAdmin'
import { getDriverForToken, getRideForToken, rideToken, driverToken, driverApplicationId } from '../../../../../lib/server/marketplaceAuth'
import { driverCanSeeRide } from '../../../../../lib/server/rideEligibility'
import { getDriverReputation } from '../../../../../lib/server/driverReputation'
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params,db=getSupabaseAdmin();const rider=await getRideForToken(id,rideToken(req));const driver=await getDriverForToken(driverApplicationId(req),driverToken(req));if(!rider&&!driver)return NextResponse.json({error:'Unauthorized'},{status:401})
 const {data:ride,error}=await db.from('ride_requests').select('*').eq('id',id).single();if(error||!ride)return NextResponse.json({error:'Ride not found'},{status:404})
 if(driver){const {data:invite}=await db.from('ride_driver_invites').select('status').eq('ride_request_id',id).eq('driver_application_id',driver.id).maybeSingle();if(['requested','negotiating'].includes(ride.status)){if(!driverCanSeeRide(driver,ride,{invited:Boolean(invite)}))return NextResponse.json({error:'This request is not available to this driver.'},{status:403})}else{const {data:accepted}=await db.from('ride_offers').select('driver_application_id').eq('id',ride.accepted_offer_id||'00000000-0000-0000-0000-000000000000').maybeSingle();if(accepted?.driver_application_id!==driver.id)return NextResponse.json({error:'This trip is no longer available.'},{status:403})}}
 const {data:offers}=await db.from('ride_offers').select('id,amount,counter_amount,status,created_at,updated_at,last_actor,driver_application_id').eq('ride_request_id',id).order('created_at',{ascending:true});const driverIds=Array.from(new Set((offers||[]).map(o=>o.driver_application_id).filter(Boolean))) as string[];let profiles:any[]=[];if(driverIds.length){const {data}=await db.from('driver_applications').select('id,full_name,driver_type,park_id,park_name,vehicle_make,vehicle_model,vehicle_year,vehicle_plate').in('id',driverIds);profiles=data||[]}const profileMap=new Map(profiles.map(p=>[p.id,p]));const reputation=await getDriverReputation(db,driverIds);const enriched=(offers||[]).map(o=>({...o,driver:profileMap.get(o.driver_application_id)||null,reputation: reputation[o.driver_application_id] || {
  average_rating: 0,
  review_count: 0,
  completed_trips: 0
}}))
 let messagesQuery=db.from('ride_messages').select('id,sender_role,body,created_at,driver_application_id,target_driver_application_id').eq('ride_request_id',id).order('created_at',{ascending:true});if(driver)messagesQuery=messagesQuery.or(`driver_application_id.eq.${driver.id},target_driver_application_id.eq.${driver.id}`);const {data:messages}=await messagesQuery
 const {data:locations}=await db.from('trip_locations').select('actor_role,driver_application_id,latitude,longitude,accuracy_meters,created_at').eq('ride_request_id',id).order('created_at',{ascending:false}).limit(20);const latest:any={};for(const l of locations||[]){const key=l.actor_role==='driver'?`driver:${l.driver_application_id}`:'rider';if(!latest[key])latest[key]=l}
 const safeRide={...ride};delete safeRide.rider_access_hash;if(driver&&!rider){safeRide.rider_phone=null;safeRide.rider_email=null;delete safeRide.trip_start_pin}
 let garage=null;if(ride.requested_park_id){const {data:p}=await db.from('registered_parks').select('id,name,state,city,address').eq('id',ride.requested_park_id).maybeSingle();garage=p}
 return NextResponse.json({ride:safeRide,garage,offers:enriched,messages:messages||[],locations:Object.values(latest),role:rider?'rider':'driver',driverApplicationId:driver?.id||null})
}
