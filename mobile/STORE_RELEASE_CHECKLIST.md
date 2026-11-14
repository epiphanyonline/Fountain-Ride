# Fountain Ride — Android + iOS Store Release Gate

**Status:** preparation only. Not store-ready. Do not submit, sign, or distribute as a production native app until every release gate passes.

## Existing source and architecture
- Live Next.js service: https://fountainride.com ; deploys separately on Vercel.
- Android Capacitor project exists on Git branch `laptop-migration-backup`, **not** on production `main`. Preserve that branch. Review binaries and Gradle configuration before bringing the Android directory into a dedicated mobile branch; do not merge all laptop-migration changes into the live web branch.
- Planned Android application ID: `com.fountainride.app`.
- iOS project not yet generated and `@capacitor/ios` dependency not yet installed.
- Current `capacitor-shell` on the backup branch is an offline placeholder, **not** a functional app.
- The Next.js website uses server routes; it cannot simply be copied into Capacitor's local `webDir` as though it were a fully static exported application.
- The app icon is the provisional purple `FR` browser mark, **not an agreed permanent store brand**.

## Account prerequisites (owner action)
- [ ] Decide which **registered company entity** will be the legal publisher (company's exact registered name and country).
- [ ] Enrol for a Google Play Console **organisation** account at https://play.google.com/console/signup (verify current identity/D-U-N-S requirements; keep access under a company-controlled Google account).
- [ ] Enrol in the Apple Developer Program as an **organisation** at https://developer.apple.com/programs/enroll/ (verify D-U-N-S and legal authority to enrol; use company-controlled Apple Account).
- [ ] Set up two-factor authentication and recovery procedures; do **not** share account passwords or signing keys in GitHub or this chat.
- [ ] Reserve `com.fountainride.app` for Android and decide iOS bundle ID; check for naming conflicts before first uploads.
- [ ] Verify a published support contact, privacy-policy URL, account-deletion pathway (where applicable), and business/legal details.

## Engineering release blockers
- [ ] Choose a native-friendly architecture: a substantial local Capacitor interface backed by the existing authenticated API, or another app implementation that has platform-appropriate features. A web-only wrapper is *not* assumed acceptable for Apple review.
- [ ] Build a functioning *bundled* UI at `capacitor-shell/`; it must include customer and driver auth, booking and quotes, bank-transfer reporting, status refresh, secure conversations, and location permissions if enabled.
- [ ] Keep `server.url` disabled in all store builds. `CAPACITOR_LIVE_RELOAD_URL` may only be used for local development.
- [ ] Review CORS, API authentication, local-token storage, app links/deep links, session persistence, notification behaviour, network-loss state, and booking recovery.
- [ ] Implement Android back-navigation and platform-safe status bars/safe areas.
- [ ] Bring forward Android code selectively from `laptop-migration-backup`; check app permissions, target API, orientation, network-security config, version code, Gradle/Java compatibility and launcher graphics.
- [ ] Install compatible `@capacitor/ios` **with lockfile update**, then create/open an iOS project on macOS with Xcode. Configure iOS privacy usage descriptions and universal links as required.
- [ ] Generate approved 1024x1024 app-store artwork, Android adaptive foreground/background and splash assets. Ensure icon contrast and legibility on phone.
- [ ] Add release versioning and change notes for both stores.
- [ ] Build signed Android App Bundle (AAB) using Play App Signing and securely backed-up signing key; never commit keystore or passwords.
- [ ] Build iOS archive through Xcode or approved macOS cloud build with correct signing/certificates and TestFlight.
- [ ] Test on real Android and iPhone devices: registration, booking, quotation acceptance, bank account display, fake payment report (no real funds), **manual admin bank credit verification on separate test data**, cancellation/refund, deep links, storage and errors.
- [ ] Confirm all production payment controls (especially historical Paystack reconciliation) and no fictitious verified test booking can trigger a real payout.
- [ ] Create app privacy and data-handling declarations based on actual data collected (drivers' location, documents, customer identifiers), privacy policy and account deletion implementation if applicable.
- [ ] Complete Play Data Safety/content rating/permissions and Apple App Privacy/content rating/screenshot/store metadata declarations.
- [ ] Perform closed/internal testing and required store review gates before production rollout.

## Build safeguard
`capacitor.config.ts` treats `CAPACITOR_LIVE_RELOAD_URL` as a **development-only** feature and fails if it is present when `CAPACITOR_STORE_BUILD=true`. This prevents accidental publication of an insecure remote-reload URL. It does **not** by itself build a functional native app.

## Practical sequence
1. Owner creates/validates both **organisation developer accounts**.
2. Engineering creates a real native-ready mobile UI and restores Android project only onto mobile branch.
3. Android internal build/test, then Play closed testing/review.
4. iOS Capacitor integration on a Mac, TestFlight, and App Store review.
5. Publish store listings after approval; storefront release is separate from the Vercel website.

## Store references
- Google Play Console: https://play.google.com/console
- Android developer policies: https://support.google.com/googleplay/android-developer/
- Apple Developer enrolment: https://developer.apple.com/programs/enroll/
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Capacitor documentation: https://capacitorjs.com/docs

**Never assume the store has approved a webview simply because a debug build installs.**
