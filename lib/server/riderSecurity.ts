import 'server-only'
import crypto from 'crypto'

export function normalizeRiderPhone(value:string){
  let digits=String(value||'').replace(/\D/g,'')
  if(digits.startsWith('234')&&digits.length===13)digits='0'+digits.slice(3)
  else if(digits.length===10)digits='0'+digits
  return digits
}

export function hashRiderPin(pin:string){
  const clean=String(pin||'').replace(/\D/g,'')
  if(!/^\d{6}$/.test(clean))throw new Error('Rider PIN must be exactly 6 digits.')
  const salt=crypto.randomBytes(16).toString('hex')
  const derived=crypto.scryptSync(clean,salt,32).toString('hex')
  return `scrypt$${salt}$${derived}`
}

export function riderPinMatches(pin:string,stored:string|null|undefined){
  if(!stored)return false
  const clean=String(pin||'').replace(/\D/g,'')
  const [kind,salt,expected]=stored.split('$')
  if(kind!=='scrypt'||!salt||!expected||!/^\d{6}$/.test(clean))return false
  const actual=crypto.scryptSync(clean,salt,32).toString('hex')
  if(actual.length!==expected.length)return false
  return crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(expected))
}
