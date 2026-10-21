import 'server-only'
import { getSupabaseAdmin } from './supabaseAdmin'
import { hashAccessToken, tokenMatches } from './accessTokens'

export async function getRideForToken(rideId:string, token:string|null){
  const db=getSupabaseAdmin()
  const {data,error}=await db.from('ride_requests').select('*').eq('id',rideId).single()
  if(error||!data)return null

  // Legacy/per-trip access remains valid.
  if(tokenMatches(token,data.rider_access_hash))return data

  // A signed-in rider account can access every ride attached to that account.
  if(token&&data.rider_account_id){
    const {data:rider}=await db.from('rider_accounts')
      .select('id,account_status')
      .eq('session_hash',hashAccessToken(token))
      .maybeSingle()
    if(rider && rider.id===data.rider_account_id && rider.account_status==='active') return data
  }
  return null
}

export async function getRiderForToken(token:string|null){
  if(!token)return null
  const db=getSupabaseAdmin()
  const {data}=await db.from('rider_accounts')
    .select('id,full_name,phone,email,account_status')
    .eq('session_hash',hashAccessToken(token))
    .maybeSingle()
  return data?.account_status==='active'?data:null
}

export async function getDriverForToken(applicationId:string|null, token:string|null){
  if(!applicationId||!token)return null
  const db=getSupabaseAdmin()
  const {data,error}=await db.from('driver_applications').select('*').eq('id',applicationId).single()
  if(error||!data||data.account_status==='locked')return null
  return tokenMatches(token,data.driver_access_hash)?data:null
}

export function rideToken(req:Request){return req.headers.get('x-ride-token')}
export function riderToken(req:Request){return req.headers.get('x-rider-token')}
export function driverToken(req:Request){return req.headers.get('x-driver-token')}
export function driverApplicationId(req:Request){return req.headers.get('x-driver-application-id')}
