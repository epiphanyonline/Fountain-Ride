import {NextResponse} from 'next/server'
import {getSupabaseAdmin} from '../../../../../lib/server/supabaseAdmin'
import {getRiderForToken,riderToken} from '../../../../../lib/server/marketplaceAuth'

export async function GET(req:Request){
 const rider=await getRiderForToken(riderToken(req))
 if(!rider)return NextResponse.json({error:'Unauthorized'},{status:401})
 const db=getSupabaseAdmin()
 const {data,error}=await db.from('ride_requests').select('*').eq('rider_account_id',rider.id).order('created_at',{ascending:false}).limit(100)
 if(error)return NextResponse.json({error:error.message},{status:500})
 const rides=(data||[]).map((r:any)=>{const x={...r};delete x.rider_access_hash;delete x.trip_start_pin;return x})
 return NextResponse.json({rides})
}
