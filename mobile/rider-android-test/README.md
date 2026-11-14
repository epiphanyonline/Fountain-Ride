# Fountain Ride Rider — Android Test Build

**Purpose:** Produce an installable **debug APK** for early on-device UX testing. This does **not** publish to Google Play, require D-U-N-S verification, or modify live Rider/Driver bookings.

The Rider home is already live at https://fountainride.com/app. It provides two main actions: **Hire a Driver** and **Hire a Car**, with bookings and profile accessible separately.

## Android test identity

- Display name: **Fountain Ride Test**
- Package ID: `com.fountainride.rider.test`
- Host: `fountainride.com`
- Start URL: `/app`
- Manifest: https://fountainride.com/rider-app-manifest.json
- Mode: **Android debug/test**, not store submission

This separate package ID intentionally avoids taking over or conflicting with the proposed production Android identity `com.fountainride.app`.

## Generate a debug APK with GitHub Actions

1. Open the **Actions** tab on the Fountain Ride GitHub repository.
2. Locate **Rider Android test APK**. For initial setup, a push to branch `mobile/rider-android-debug-build-20261114` runs the build; after the workflow is present on the default branch, it can also be run manually.
3. Open the latest workflow run. If the build succeeds, select the uploaded artifact **fountain-ride-rider-debug-apk** under Artifacts.
4. Download and unzip the artifact. Transfer the `.apk` to an Android phone and install it as a test app. Android may require permission for installing apps from the file manager.
5. Chrome may display its browser controls until a matching Digital Asset Links certificate association is deployed. This is expected for a debug build; it is not a Play Store release.

The CI workflow uses Java, Android SDK, Bubblewrap and Gradle. It generates project files during the workflow and signs only with the default **ephemeral debug key**. No upload keystore or passwords are committed.

## Local alternative (Windows / VS Code)

Prerequisites: Node.js, JDK compatible with Bubblewrap/Gradle, Android SDK / Android Studio, working internet access.

```powershell
git fetch origin
git switch mobile/rider-android-debug-build-20261114
npm.cmd install --global @bubblewrap/cli
cd mobile/rider-android-test
bubblewrap updateConfig --jdkPath="C:\Path\To\JDK" --androidSdkPath="C:\Users\You\AppData\Local\Android\Sdk"
bubblewrap update --skipVersionUpgrade
.\gradlew.bat assembleDebug
```

Find the APK under `mobile/rider-android-test/app/build/outputs/apk/debug/`. The generated Android files and Java/Android SDK output should not be merged into the live website until reviewed.

## Critical limitations and next steps

- An **APK is not yet confirmed built** until a successful CI or local Gradle build produces an artifact. GitHub Actions logs are the source of truth; a committed workflow is not an APK.
- The debug app may fall back to a browser/custom tab until trusted-app association (Digital Asset Links) is configured with the actual certificate SHA-256 fingerprint.
- This test package is NOT a signed release AAB. Google Play publication will require separate production package ID, durable signing key, Digital Asset Links, legal verification and store review.
- Android tests must cover back navigation, car/driver hire, request submission, quotes, payment instructions, booking history, Rider login and offline error behaviour.
- Do not enter real bank transfers or approve payout records merely to exercise a test app.
- The registration status of the D-U-N-S enquiry is independent of this test build. No need to resubmit the enquiry while awaiting the team's reply.
