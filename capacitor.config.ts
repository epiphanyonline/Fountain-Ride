import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Fountain Ride native app configuration.
 *
 * The Next.js production website is server-rendered. Native releases must
 * ship a separately built local mobile UI in webDir. Do not point server.url
 * at the public site to bypass the native build.
 *
 * For device-only development, opt in to live reload with
 * CAPACITOR_LIVE_RELOAD_URL. Never use it for a store build.
 */
const liveReloadUrl = process.env.CAPACITOR_LIVE_RELOAD_URL?.trim()
const storeBuild = process.env.CAPACITOR_STORE_BUILD === 'true'

if (storeBuild && liveReloadUrl) {
  throw new Error(
    'Store builds cannot use CAPACITOR_LIVE_RELOAD_URL. Bundle the mobile UI locally.'
  )
}

if (liveReloadUrl && !/^https?:\/\//i.test(liveReloadUrl)) {
  throw new Error('CAPACITOR_LIVE_RELOAD_URL must be an http(s) URL.')
}

const config: CapacitorConfig = {
  appId: 'com.fountainride.app',
  appName: 'Fountain Ride',
  webDir: 'capacitor-shell',
  ...(liveReloadUrl
    ? {
        server: {
          url: liveReloadUrl,
          cleartext: liveReloadUrl.startsWith('http://'),
        },
      }
    : {}),
  android: {
    allowMixedContent: false,
  },
}

export default config
