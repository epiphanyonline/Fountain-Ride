import type { CapacitorConfig } from '@capacitor/cli'

const serverUrl = process.env.CAPACITOR_SERVER_URL

const config: CapacitorConfig = {
  appId: 'com.fountainride.app',
  appName: 'Fountain Ride',
  webDir: 'capacitor-shell',

  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: true,
        androidScheme: 'http',
      }
    : undefined,

  android: {
    allowMixedContent: true,
  },
}

export default config
