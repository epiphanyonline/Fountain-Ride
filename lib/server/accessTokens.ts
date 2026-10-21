import 'server-only'
import crypto from 'crypto'

export function createAccessToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashAccessToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function tokenMatches(token: string | null | undefined, hash: string | null | undefined) {
  if (!token || !hash) return false
  const actual = hashAccessToken(token)
  if (actual.length !== hash.length) return false
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(hash))
}
