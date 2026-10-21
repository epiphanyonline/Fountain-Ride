import { NextResponse } from 'next/server'
import { setAdminSession, validAdminPassword } from '../../../../lib/server/adminSession'
export async function POST(req:Request){ const body=await req.json().catch(()=>({})); if(!validAdminPassword(String(body.password||''))) return NextResponse.json({error:'Invalid admin password'},{status:401}); await setAdminSession(); return NextResponse.json({ok:true}) }
