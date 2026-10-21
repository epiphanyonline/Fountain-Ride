import {NextResponse} from 'next/server'
import {getSupabaseAdmin} from '../../../../../../lib/server/supabaseAdmin'
import {getRideForToken,rideToken} from '../../../../../../lib/server/marketplaceAuth'

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const rider=await getRideForToken(id,rideToken(req));if(!rider)return NextResponse.json({error:'Unauthorized'},{status:401})
  const db=getSupabaseAdmin();const {data}=await db.from('ride_reviews').select('*').eq('ride_request_id',id).maybeSingle()
  return NextResponse.json({review:data||null})
}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const rider=await getRideForToken(id,rideToken(req));if(!rider)return NextResponse.json({error:'Unauthorized'},{status:401})
  if(rider.status!=='completed')return NextResponse.json({error:'Reviews are available after the trip is completed.'},{status:409})
  const body=await req.json().catch(()=>null),rating=Number(body?.rating)
  if(!Number.isInteger(rating)||rating<1||rating>5)return NextResponse.json({error:'Choose an overall rating from 1 to 5.'},{status:400})
  const db=getSupabaseAdmin();const {data:offer}=await db.from('ride_offers').select('driver_application_id').eq('id',rider.accepted_offer_id||'00000000-0000-0000-0000-000000000000').maybeSingle()
  if(!offer?.driver_application_id)return NextResponse.json({error:'Selected driver not found.'},{status:409})
  const clean=(v:any)=>{const n=Number(v);return Number.isInteger(n)&&n>=1&&n<=5?n:null}
  const payload={ride_request_id:id,driver_application_id:offer.driver_application_id,rating,comment:String(body?.comment||'').trim().slice(0,1000)||null,punctuality_rating:clean(body?.punctuality),safety_rating:clean(body?.safety),vehicle_rating:clean(body?.vehicle),communication_rating:clean(body?.communication),professionalism_rating:clean(body?.professionalism),review_status:'published'}
  const {data:existing}=await db.from('ride_reviews').select('id').eq('ride_request_id',id).eq('driver_application_id',offer.driver_application_id).maybeSingle();const result=existing?await db.from('ride_reviews').update(payload).eq('id',existing.id).select('*').single():await db.from('ride_reviews').insert(payload).select('*').single();if(result.error)return NextResponse.json({error:result.error.message},{status:500});return NextResponse.json({ok:true,review:result.data})
}
