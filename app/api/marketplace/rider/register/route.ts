import {NextResponse} from 'next/server'
import {getSupabaseAdmin} from '../../../../../lib/server/supabaseAdmin'
import {createAccessToken,hashAccessToken} from '../../../../../lib/server/accessTokens'
import {hashRiderPin,normalizeRiderPhone} from '../../../../../lib/server/riderSecurity'

export async function POST(req:Request){
 const b=await req.json().catch(()=>null)
 const fullName=String(b?.name||'').trim(),phone=String(b?.phone||'').trim()
 const phoneKey=normalizeRiderPhone(phone),email=String(b?.email||'').trim()||null
 const pin=String(b?.pin||'').replace(/\D/g,'')
 if(fullName.length<2||phoneKey.length<10||!/^\d{6}$/.test(pin))
   return NextResponse.json({error:'Enter your full name, mobile number and a 6-digit Rider PIN.'},{status:400})

 const db=getSupabaseAdmin()
 const {data:existing}=await db.from('rider_accounts').select('id').eq('phone_login_key',phoneKey).maybeSingle()
 if(existing)return NextResponse.json({error:'A rider account already exists for this mobile number. Sign in instead.'},{status:409})

 const accessToken=createAccessToken()
 const {data,error}=await db.from('rider_accounts').insert({
   full_name:fullName,phone,phone_login_key:phoneKey,email,
   login_pin_hash:hashRiderPin(pin),session_hash:hashAccessToken(accessToken)
 }).select('id,full_name,phone,email').single()
 if(error)return NextResponse.json({error:error.message},{status:500})
 return NextResponse.json({rider:data,accessToken},{status:201})
}
