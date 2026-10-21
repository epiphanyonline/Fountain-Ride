import 'server-only'
import crypto from 'crypto'

function hashSixDigitPin(pin:string,label:string){
  const clean=String(pin||'').replace(/\D/g,'')
  if(!/^\d{6}$/.test(clean))throw new Error(`${label} must be exactly 6 digits.`)
  const salt=crypto.randomBytes(16).toString('hex')
  const derived=crypto.scryptSync(clean,salt,32).toString('hex')
  return `scrypt$${salt}$${derived}`
}
function sixDigitPinMatches(pin:string,stored:string|null|undefined){
  if(!stored)return false
  const clean=String(pin||'').replace(/\D/g,'')
  const [kind,salt,expected]=stored.split('$')
  if(kind!=='scrypt'||!salt||!expected||!/^\d{6}$/.test(clean))return false
  const actual=crypto.scryptSync(clean,salt,32).toString('hex')
  if(actual.length!==expected.length)return false
  return crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(expected))
}

export function hashWalletPin(pin:string){return hashSixDigitPin(pin,'Wallet PIN')}
export function walletPinMatches(pin:string,stored:string|null|undefined){return sixDigitPinMatches(pin,stored)}
export function hashLoginPin(pin:string){return hashSixDigitPin(pin,'Driver PIN')}
export function loginPinMatches(pin:string,stored:string|null|undefined){return sixDigitPinMatches(pin,stored)}

export function normalizeDriverPhone(value:string){
  let digits=String(value||'').replace(/\D/g,'')
  if(digits.startsWith('234')&&digits.length===13)digits='0'+digits.slice(3)
  else if(digits.length===10)digits='0'+digits
  return digits
}

export function createActivationToken(){return crypto.randomBytes(24).toString('base64url')}
export function hashActivationToken(token:string){return crypto.createHash('sha256').update(token).digest('hex')}
export function activationTokenMatches(token:string|null|undefined,hash:string|null|undefined){
  if(!token||!hash)return false
  const actual=hashActivationToken(token)
  if(actual.length!==hash.length)return false
  return crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(hash))
}
