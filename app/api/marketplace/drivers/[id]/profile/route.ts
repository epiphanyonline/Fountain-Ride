import {NextResponse} from 'next/server'
import {getSupabaseAdmin} from '../../../../../../lib/server/supabaseAdmin'
import {getDriverReputation} from '../../../../../../lib/server/driverReputation'
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params,db=getSupabaseAdmin();const {data:driver}=await db.from('driver_applications').select('id,full_name,driver_type,park_name,home_state,home_city,vehicle_make,vehicle_model,vehicle_year,verification_status,created_at').eq('id',id).eq('verification_status','approved').maybeSingle();if(!driver)return NextResponse.json({error:'Driver profile not found'},{status:404})
 const reputation=(await getDriverReputation(db,[id]))[id]
 const {data:reviews}=await db.from('ride_reviews').select('id,rating,comment,punctuality_rating,safety_rating,vehicle_rating,communication_rating,professionalism_rating,created_at').eq('driver_application_id',id).eq('review_status','published').order('created_at',{ascending:false}).limit(30)
 return NextResponse.json({driver,reputation,reviews:reviews||[]})
}
