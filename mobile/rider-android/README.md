# Fountain Ride — Rider Android application (first release)

**Status:** Rider-first home is implemented at `/app` on this feature branch, but no Android APK/AAB has been signed or uploaded to Google Play. The D‑U‑N‑S enquiry and Google Play organisation verification are still pending.

## Customer-facing design

The app starts at `https://fountainride.com/app`. Unlike the public marketing website at `/`, this home intentionally contains only two large service choices:

1. **Hire a Driver** → `/hire-driver` — your car, our driver.
2. **Hire a Car** → `/cars` — vehicle with a driver included.

Small links to **My bookings** (`/rider`) and **Profile** (`/rider/profile`) are available; the already-existing customer service flows handle quotes, bank transfers, booking status and messages. There is no driver registration, driver dashboard, driver wallet or administrative option on the Rider app home.

### Design details
- One clear page title, two large accessible touch targets, simple icons, generous spacing and strong contrast.
- Green card for Driver Hire and warm yellow card for Car Hire.
- No advertising, pricing guesses, stock photography or lengthy explanatory cards.
- Keep existing Fountain Ride corporate logo pending final approved artwork; this design is not the final approved app-store icon.
- Existing marketing homepage `/` remains unchanged.
- In an app browsing session starting at `/app`, the existing mobile and header Home navigation returns to `/app` rather than the marketing homepage. Navigation remains within the same origin, so booking tokens are preserved.

## Android Trusted Web Activity route

A Trusted Web Activity is a practical, website-backed Android launch strategy. It requires a Chrome-compatible browser and an Android package that proves control of `fountainride.com` using Digital Asset Links.

**Do not declare this app published or installable as a signed APK until the following steps are completed.**

1. Deploy and verify this feature through a Vercel preview. Note that a preview hostname cannot be trusted as `fountainride.com`.
2. After review, deploy the `/app` page and `/rider-app-manifest.json` to the live Rider website. Do not replace the main customer website homepage.
3. Install a supported Android Java/JDK environment, Android SDK and Bubblewrap CLI on the local build computer. Use the official CLI's wizard to initialise the package from `https://fountainride.com/rider-app-manifest.json`. Keep its generated app configuration within `mobile/rider-android/` in a dedicated build workflow.
4. Use Android package ID **`com.fountainride.app`**, app name **Fountain Ride**, launcher start URL `https://fountainride.com/app`, and version code beginning at 1 (only if that ID is not already reserved or used in Play Console).
5. Generate a private upload signing key and back it up securely outside the repository. **Never commit keystores, passwords or a service role key.**
6. Obtain the signed release certificate **SHA‑256 fingerprint** from the Android signing workflow. Do not guess the fingerprint or publish a placeholder.
7. Create `https://fountainride.com/.well-known/assetlinks.json` with a valid `delegate_permission/common.handle_all_urls` relation and matching package name/certificate SHA‑256 fingerprint, then verify Android/TWA fullscreen behaviour. Signing-key changes will require updating the association.
8. Test on real Android devices (first installation, home screen, customer sign-in, Hire Driver, Hire Car, quotes, returning to home, booking recovery, bank-transfer instructions, browser fallback, back button, errors and no network). Do not approve fake bank transfers or initiate a real payout in testing.
9. Provide an approved 512×512 PNG launcher icon, 1024×500 Play Store feature graphic, genuine screenshots, contact and support email, public privacy policy, account deletion mechanism if the app allows account creation, and truthful Play Data Safety disclosures.
10. After your Google Play **organisation account and D‑U‑N‑S verification** are complete, upload the signed `.aab` to Play Console testing, pass Google review and publish.

## Safety and scope

- Rider and Driver website sessions are already separated on their own domains. Existing Rider booking access remains on `fountainride.com`; the Driver site is `drivers.fountainride.com`.
- A TWA displays the live customer website. Website/backend improvements can take effect without rebuilding the Android binary, but native integration, branding, permissions or package identity changes require a new package and Play Store review.
- Google Play may review functionality, data use, quality and policy compliance even if the TWA opens properly. An installable app is not equivalent to store approval.
- The **only** app to publish in this phase is the Rider app. Fountain Ride Driver will have a different app ID and release lifecycle.

## Release test checklist

- [ ] Vercel preview passes Next.js build, TypeScript and route generation
- [ ] Two primary actions link to correct, working customer forms
- [ ] Rider bookings and profile remain accessible
- [ ] Browser home navigation remains in the app experience for an app session
- [ ] Confirm no private information is cached by the service worker
- [ ] Host the web app under `fountainride.com` and verify the web manifest
- [ ] Generate signed Android release and correct Digital Asset Links
- [ ] Run real-device booking smoke tests without live payouts
- [ ] Complete Google Play developer verification and app disclosures
- [ ] Google Play internal testing and review
