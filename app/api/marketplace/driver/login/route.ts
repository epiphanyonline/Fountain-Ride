import {NextResponse} from 'next/server'
import {getSupabaseAdmin} from '../../../../../lib/server/supabaseAdmin'
import {createAccessToken,hashAccessToken} from '../../../../../lib/server/accessTokens'
import {loginPinMatches,normalizeDriverPhone} from '../../../../../lib/server/driverSecurity'
export async function POST(req:Request){
 const b=await req.json().catch(()=>null),phoneKey=normalizeDriverPhone(String(b?.phone||'')),pin=String(b?.pin||'').replace(/\D/g,'');if(phoneKey.length<10||!/^[0-9]{6}$/.test(pin))return NextResponse.json({error:'Enter your mobile number and 6-digit Driver PIN.'},{status:400})
 const db=getSupabaseAdmin();const {data:driver}=await db.from('driver_applications').select('*').eq('phone_login_key',phoneKey).order('created_at',{ascending:false}).limit(1).maybeSingle();if(!driver||driver.account_status==='locked')return NextResponse.json({error:'Mobile number or Driver PIN is incorrect.'},{status:401})
 if(driver.login_locked_until&&new Date(driver.login_locked_until).getTime()>Date.now())return NextResponse.json({error:'Too many incorrect attempts. Try again in about 15 minutes.'},{status:429})
 if(!driver.login_pin_hash)return NextResponse.json({error:'This driver account still needs security setup. Ask Fountain Ride for an activation link.'},{status:409})
 if(!loginPinMatches(pin,driver.login_pin_hash)){
   const attempts=Number(driver.failed_login_attempts||0)+1,locked=attempts>=5?new Date(Date.now()+15*60*1000).toISOString():null;await db.from('driver_applications').update({failed_login_attempts:attempts>=5?0:attempts,login_locked_until:locked,updated_at:new Date().toISOString()}).eq('id',driver.id);await db.from('driver_security_events').insert({driver_application_id:driver.id,event_type:locked?'driver_login_temporarily_locked':'driver_login_failed',actor_type:'driver',metadata:{attempt:attempts}});return NextResponse.json({error:locked?'Too many incorrect attempts. Try again in about 15 minutes.':'Mobile number or Driver PIN is incorrect.'},{status:locked?429:401})
 }
 const accessToken=createAccessToken(),now=new Date().toISOString();await db.from('driver_applications').update({driver_access_hash:hashAccessToken(accessToken),failed_login_attempts:0,login_locked_until:null,account_security_updated_at:now,updated_at:now}).eq('id',driver.id);await db.from('driver_security_events').insert({driver_application_id:driver.id,event_type:'driver_pin_login_success',actor_type:'driver'});return NextResponse.json({applicationId:driver.id,accessToken,status:driver.verification_status})
}
