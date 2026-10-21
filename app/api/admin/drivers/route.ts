import {NextResponse} from 'next/server'
import {isAdminSession} from '../../../../lib/server/adminSession'
import {getSupabaseAdmin} from '../../../../lib/server/supabaseAdmin'
import {createActivationToken,hashActivationToken,normalizeDriverPhone} from '../../../../lib/server/driverSecurity'
import {NIGERIA_STATES} from '../../../../lib/marketplace'

export async function POST(req:Request){
 if(!await isAdminSession())return NextResponse.json({error:'Unauthorized'},{status:401})
 const b=await req.json().catch(()=>null);if(!b)return NextResponse.json({error:'Invalid request'},{status:400})
 const required=['full_name','phone','home_state','vehicle_make','vehicle_model','vehicle_plate']
 for(const k of required)if(!String(b[k]||'').trim())return NextResponse.json({error:'Complete all required driver fields.'},{status:400})
 if(!NIGERIA_STATES.includes(String(b.home_state)))return NextResponse.json({error:'Invalid home state.'},{status:400})
 const driverType=b.driver_type==='commercial'?'commercial':'private'
 if(driverType==='commercial'&&!String(b.park_id||'').trim()&&!String(b.park_name||'').trim())return NextResponse.json({error:'Commercial drivers must be linked to a garage/park.'},{status:400})
 const db=getSupabaseAdmin();const phone=String(b.phone).trim(),phoneKey=normalizeDriverPhone(phone),email=String(b.email||'').trim().toLowerCase()||null,plate=String(b.vehicle_plate).trim().toUpperCase()
 const filters=[`phone_login_key.eq.${phoneKey}`,`vehicle_plate.eq.${plate}`];if(email)filters.push(`email.eq.${email}`);const {data:dupes}=await db.from('driver_applications').select('id,phone,email,vehicle_plate').or(filters.join(',')).limit(5)
 if((dupes||[]).length)return NextResponse.json({error:'A driver with this mobile number, email or vehicle plate already exists.'},{status:409})
 const token=createActivationToken(),expires=new Date(Date.now()+7*24*60*60*1000).toISOString()
 const {data,error}=await db.from('driver_applications').insert({full_name:String(b.full_name).trim(),phone,phone_login_key:phoneKey,email,driver_type:driverType,park_id:String(b.park_id||'').trim()||null,park_name:String(b.park_name||'').trim()||null,home_state:String(b.home_state),home_city:String(b.home_city||'').trim()||null,vehicle_make:String(b.vehicle_make).trim(),vehicle_model:String(b.vehicle_model).trim(),vehicle_year:Number(b.vehicle_year)||null,vehicle_plate:plate,accept_unverified_riders:b.accept_unverified_riders!==false,verification_status:'pending',account_status:'pre_registered',activation_hash:hashActivationToken(token),activation_expires_at:expires,is_available:true}).select('id,full_name,account_status').single()
 if(error)return NextResponse.json({error:error.message},{status:500})
 await db.from('driver_security_events').insert({driver_application_id:data.id,event_type:'admin_pre_registered',actor_type:'admin',metadata:{expires_at:expires}})
 const base=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin
 return NextResponse.json({driver:data,activationUrl:`${base}/driver/claim?driver=${data.id}&token=${encodeURIComponent(token)}`,expiresAt:expires},{status:201})
}
