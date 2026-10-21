import {NextResponse} from 'next/server'
import {getSupabaseAdmin} from '../../../../../lib/server/supabaseAdmin'
import {createAccessToken,hashAccessToken} from '../../../../../lib/server/accessTokens'
import {normalizeRiderPhone,riderPinMatches} from '../../../../../lib/server/riderSecurity'

export async function POST(req:Request){
 const b=await req.json().catch(()=>null),phoneKey=normalizeRiderPhone(String(b?.phone||''))
 const pin=String(b?.pin||'').replace(/\D/g,'')
 if(phoneKey.length<10||!/^\d{6}$/.test(pin))
   return NextResponse.json({error:'Enter your mobile number and 6-digit Rider PIN.'},{status:400})

 const db=getSupabaseAdmin()
 const {data:rider}=await db.from('rider_accounts').select('*').eq('phone_login_key',phoneKey).maybeSingle()
 if(!rider||rider.account_status!=='active')
   return NextResponse.json({error:'Mobile number or Rider PIN is incorrect.'},{status:401})
 if(rider.login_locked_until&&new Date(rider.login_locked_until).getTime()>Date.now())
   return NextResponse.json({error:'Too many incorrect attempts. Try again in about 15 minutes.'},{status:429})

 if(!riderPinMatches(pin,rider.login_pin_hash)){
   const attempts=Number(rider.failed_login_attempts||0)+1
   const locked=attempts>=5?new Date(Date.now()+15*60*1000).toISOString():null
   await db.from('rider_accounts').update({
     failed_login_attempts:attempts>=5?0:attempts,login_locked_until:locked,updated_at:new Date().toISOString()
   }).eq('id',rider.id)
   return NextResponse.json({error:locked?'Too many incorrect attempts. Try again in about 15 minutes.':'Mobile number or Rider PIN is incorrect.'},{status:locked?429:401})
 }

 const accessToken=createAccessToken()
 await db.from('rider_accounts').update({
   session_hash:hashAccessToken(accessToken),failed_login_attempts:0,login_locked_until:null,updated_at:new Date().toISOString()
 }).eq('id',rider.id)
 return NextResponse.json({rider:{id:rider.id,full_name:rider.full_name,phone:rider.phone,email:rider.email},accessToken})
}
