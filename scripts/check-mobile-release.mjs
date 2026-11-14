#!/usr/bin/env node
/**
 * Fountain Ride native app-store release preflight.
 *
 * READ ONLY. This script intentionally fails until a real bundled mobile UI,
 * Android/iOS projects, and store-ready compliance assets are present.
 * No secrets, network calls, or production writes.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let failures = 0
function check(label, pass, fix) {
  const icon = pass ? 'PASS' : 'BLOCKED'
  console.log(`[${icon}] ${label}`)
  if (!pass) {
    console.log(`          ${fix}`)
    failures++
  }
}
const root = process.cwd()
const file = p => resolve(root, p)
const exists = p => existsSync(file(p))
const capacitor = exists('capacitor.config.ts')
  ? readFileSync(file('capacitor.config.ts'), 'utf8')
  : ''
const pkg = exists('package.json')
  ? JSON.parse(readFileSync(file('package.json'), 'utf8'))
  : { dependencies: {} }
const shell = exists('capacitor-shell/index.html')
  ? readFileSync(file('capacitor-shell/index.html'), 'utf8')
  : ''
const deps = pkg.dependencies || {}

console.log('Fountain Ride app-store preflight (no production changes)')
check('Capacitor configuration is present', Boolean(capacitor), 'Add capacitor.config.ts.')
check('Store build is protected from live reload', capacitor.includes('CAPACITOR_STORE_BUILD'), 'Disallow live-reload URLs for release builds.')
check('Android project exists on this branch', exists('android/app/build.gradle'), 'Bring reviewed Android code from laptop-migration-backup onto the mobile branch.')
check('iOS project exists on this branch', exists('ios/App/App.xcodeproj/project.pbxproj'), 'Install compatible @capacitor/ios and generate the Xcode project on macOS.')
check('iOS Capacitor dependency is present', Boolean(deps['@capacitor/ios']), 'Add compatible @capacitor/ios and update package lockfile.')
check('Bundled mobile UI is present', Boolean(shell) && !/connect to the internet to continue/i.test(shell), 'A placeholder is not a functioning local mobile app; build an offline-capable shell.')
check('Android release icon source exists', exists('public/icon-512.png'), 'Create approved app icon artwork for Android/iOS.')
check('Store checklist exists', exists('mobile/STORE_RELEASE_CHECKLIST.md'), 'Keep the checklist under version control.')
if (process.env.CAPACITOR_LIVE_RELOAD_URL && process.env.CAPACITOR_STORE_BUILD === 'true') {
  check('No development remote reload URL in store build', false, 'Unset CAPACITOR_LIVE_RELOAD_URL before preparing a store build.')
}

console.log(`\nPreflight: ${failures === 0 ? 'passed technical file checks only; manual review still required' : `${failures} blocked check(s). Do not submit to app stores.`}`)
process.exitCode = failures ? 1 : 0
