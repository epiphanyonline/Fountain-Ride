# Fountain Ride: Two Android apps, one backend

This document is the build contract for the future native packages. Neither
package is Play Store ready. Google Play Console verification is outstanding.

## Rider (primary app)
- Play Store name: **Fountain Ride**
- Android application ID: `com.fountainride.app`
- Home surface: `https://fountainride.com/`
- Features: Hire a Car, Hire a Driver, quotations, bookings, payment reporting,
  booking messages and customer profile
- Distinct app icon, splash screen, private storage and push notification channel
- Customer tokens only; no driver controls or Driver PINs in the client

## Driver (secondary app)
- Play Store name: **Fountain Ride Driver**
- Android application ID: `com.fountainride.driver`
- Web domain (after DNS configuration): `https://drivers.fountainride.com/`
- Home surface: `/driver`
- Features: Driver activation, verified Driver PIN, opportunities, trips,
  offers, driver availability, earnings, wallet and profile
- Independent app icon, splash screen, storage and push notification channel
- Driver tokens only; no rider account UI

## Architecture and security gates
- Shared Supabase and Next.js APIs remain; server endpoints validate separate
  Rider or Driver credentials. Hostname/UI changes alone are not an authorization
  boundary. Do not expose the service role key in the Android binary.
- Keep Driver and Rider separate on domain origin, bundle ID, app data directory,
  deep links, web push/mobile push configuration and local secure storage.
- Add native UI and signed Android AAB separately for each application. The existing
  backup `capacitor-shell` placeholder is NOT a functional application.
- Preserve current driver registrations, bookings, driver activation links and
  accounts until verified migration to the Driver hostname.
- Maintain the current Rider website and existing API payment flows during migration.
- Do not rely on a production Capacitor `server.url` to load the website as a
  shortcut for preparing a publishable native app.
- Confirm DNS TLS, session login, account recovery, booking flows, wallet,
  geolocation and notification/deep-link behaviour on each domain.
- Until the new driver host is verified and communicated, the legacy
  `https://fountainride.com/driver` routes remain available.
- Google Play submission requires an approved organisation account, tested signed
  Android App Bundle for each unique package ID, privacy policy, account deletion,
  Data Safety declarations and store review.
