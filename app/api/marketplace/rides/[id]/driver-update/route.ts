import {NextResponse} from 'next/server'
import {getSupabaseAdmin} from '../../../../../../lib/server/supabaseAdmin'
import {getDriverForToken,driverToken,driverApplicationId} from '../../../../../../lib/server/marketplaceAuth'

const allowed=new Set(['reconfirmed','preparing','on_my_way','30_min','10_min','approaching','arrived'])
const etaMap:Record<string,number|null>={reconfirmed:null,preparing:null,on_my_way:null,'30_min':30,'10_min':10,approaching:5,arrived:0}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params
 const driver=await getDriverForToken(driverApplicationId(req),driverToken(req))
 if(!driver)return NextResponse.json({error:'Unauthorized'},{status:401})
 const body=await req.json().catch(()=>null);const signal=String(body?.signal||'')
 if(!allowed.has(signal))return NextResponse.json({error:'Invalid driver update.'},{status:400})
 const db=getSupabaseAdmin()
 const {data:ride}=await db.from('ride_requests').select('id,status,accepted_offer_id').eq('id',id).single()
 if(!ride)return NextResponse.json({error:'Ride not found'},{status:404})
 const {data:accepted}=await db.from('ride_offers').select('driver_application_id').eq('id',ride.accepted_offer_id||'00000000-0000-0000-0000-000000000000').maybeSingle()
 if(accepted?.driver_application_id!==driver.id)return NextResponse.json({error:'You are not the selected driver.'},{status:403})
 if(!['confirmed','driver_en_route','driver_arrived'].includes(ride.status))return NextResponse.json({error:'Arrival updates are available after payment confirmation.'},{status:409})
 const now=new Date().toISOString();const patch:any={driver_presence_status:signal,driver_eta_minutes:etaMap[signal],driver_presence_updated_at:now,updated_at:now}
 if(signal==='reconfirmed')patch.driver_reconfirmed_at=now
 if(['on_my_way','30_min','10_min','approaching'].includes(signal)&&ride.status==='confirmed')patch.status='driver_en_route'
 if(signal==='arrived')patch.status='driver_arrived'
 const {error}=await db.from('ride_requests').update(patch).eq('id',id)
 if(error)return NextResponse.json({error:error.message},{status:500})
 await db.from('trip_events').insert({ride_request_id:id,event_type:`driver_${signal}`,metadata:{driver_application_id:driver.id,eta_minutes:etaMap[signal]}})
 return NextResponse.json({ok:true,...patch})
}
