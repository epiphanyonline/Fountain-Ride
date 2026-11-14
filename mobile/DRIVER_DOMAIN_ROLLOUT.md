# Dedicated Driver portal rollout

## Proposed production URL
`https://drivers.fountainride.com`

## Existing architecture
Driver and Rider route trees share one Next.js/Vercel project and backend; a
Next.js proxy detects `drivers.fountainride.com`. It keeps existing driver APIs
and web pages working while presenting a dedicated origin for driver sessions.
The Rider and Driver domains have separate web storage by browser origin.

## Rollout checklist
1. Deploy the hostname-aware proxy to a Vercel preview and confirm build.
2. Add `drivers.fountainride.com` to the EXISTING Vercel fountain-ride project.
3. At Go54 DNS (domain's currently reported nameservers), create or update
   the `drivers` DNS CNAME pointing at the precise target returned by Vercel.
   Do not change the apex or `www` records.
4. Wait for Vercel domain verification and TLS certificate readiness.
5. Test the driver home `/`, `/driver/login`, `/driver/register`,
   `/driver/claim`, `/driver`, `/driver/trips`, `/driver/wallet`,
   `/driver/profile`, plus legitimate Driver Hire jobs.
6. Confirm Rider routes redirect to `https://fountainride.com`, and
   `/admin` cannot be accessed through the driver host.
7. Verify `/manifest.json` returns Driver PWA identity only on driver host,
   Rider PWA identity remains available at fountainride.com, and the
   service worker never caches sensitive API data.
8. Test distinct Rider and Driver sessions on the same device across both
   domains; verify driver and rider sign-out independently.
9. Only after successful activation tests, update administrative activation
   links, verified-email recovery redirect URLs and communication materials
   to prefer the new host.
10. Keep original driver routes as a temporary fallback during transition;
    do not force-redirect legacy driver clients before migration checks.

## Release caveats
- Neither hostname separation nor hiding routes replaces backend authorization.
- Separate Google Play application builds are NOT yet available.
- No driver data, banking records, live payouts or current bookings should be
  changed as part of creating the portal.
