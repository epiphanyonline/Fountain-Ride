import 'server-only'
import crypto from 'crypto'
import { cookies } from 'next/headers'

const COOKIE = 'fountain_admin_session'
function secret(){ return process.env.ADMIN_PASSWORD || '' }
function token(){ const s=secret(); return s ? crypto.createHash('sha256').update(`fountain-ride-admin:${s}`).digest('hex') : '' }
export async function isAdminSession(){ const c=await cookies(); const got=c.get(COOKIE)?.value||''; const expected=token(); return !!expected && got.length===expected.length && crypto.timingSafeEqual(Buffer.from(got),Buffer.from(expected)) }
export async function setAdminSession(){ const c=await cookies(); c.set(COOKIE,token(),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*12}) }
export async function clearAdminSession(){ const c=await cookies(); c.set(COOKIE,'',{httpOnly:true,path:'/',maxAge:0}) }
export function validAdminPassword(v:string){ const s=secret(); if(!s||v.length!==s.length)return false; return crypto.timingSafeEqual(Buffer.from(v),Buffer.from(s)) }
