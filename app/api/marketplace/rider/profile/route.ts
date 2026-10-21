import {NextResponse} from 'next/server'
import {getSupabaseAdmin} from '../../../../../lib/server/supabaseAdmin'
import {getRiderForToken,riderToken} from '../../../../../lib/server/marketplaceAuth'

export async function GET(req:Request){
 const rider=await getRiderForToken(riderToken(req))
 if(!rider)return NextResponse.json({error:'Unauthorized'},{status:401})
 return NextResponse.json({rider})
}
export async function PATCH(req:Request){
 const rider=await getRiderForToken(riderToken(req))
 if(!rider)return NextResponse.json({error:'Unauthorized'},{status:401})
 const b=await req.json().catch(()=>null),fullName=String(b?.name||'').trim(),email=String(b?.email||'').trim()||null
 if(fullName.length<2)return NextResponse.json({error:'Enter your full name.'},{status:400})
 const db=getSupabaseAdmin()
 const {data,error}=await db.from('rider_accounts').update({full_name:fullName,email,updated_at:new Date().toISOString()}).eq('id',rider.id).select('id,full_name,phone,email').single()
 if(error)return NextResponse.json({error:error.message},{status:500})
 return NextResponse.json({rider:data})
}
