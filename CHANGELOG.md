# Changelog

## 1.2.0

### Changes

- **App matrix** — The app list is a table: apps down, Play, iOS and macOS across. Each cell shows the live version, with releases in flight below it as a status icon and version (status in words on wider screens)
- **Alerts as icons** — TestFlight expiry and stores that failed to load show as a warning icon next to the app name

## 1.1.2

### Fixes

- **Mobile app list** — Each store and Apple platform gets its own row, with versions and statuses aligned in columns

## 1.1.1

### Changes

- **iOS and macOS apart** — Apps on several Apple platforms show one version column per platform, labelled iOS or macOS, and each platform counts on its own for Needs attention

### Fixes

- **Mobile app list** — App names get their own row on phones, versions and statuses wrap below instead of squeezing the name

## 1.1.0

Store features ported from the AWL Storefront.

### Features

- **New dashboard layout** — Compact app list with a side panel (`?app=`), search, filters (In review, Issues, Google, Apple), a Prod/Dev toggle and a Dev badge
- **Needs attention** — Apps with a release in review, rejected, halted or waiting to publish, a TestFlight build about to expire, or a store that failed to load are listed first
- **Google Play review state** — Releases show In Review, Pending Publication, Rejected or Not Sent for Review, read without an edit
- **Staged rollouts and phased releases** — Rollout percentage on Google Play and App Store releases, halted or paused rollouts in amber
- **TestFlight** — Every testable build on the internal and external track, with its expiry date
- **Store status labels** — Named like App Store Connect and the Play Console
- **Console deep links** — Releases open their App Store Connect page or Play Console track (set the Play Console link per app)
- **Android vitals** — Crash and freeze rate per version over the last 7 days, against Google Play's bad-behaviour thresholds
- **Add apps** — One dialog lists every app of both accounts, pairs Google Play and App Store apps automatically, and sorts by last upload
- **Custom icons** — Drop an image onto an app icon in the side panel; App Store icons fall back to the Swiss store and the newest build

### Changes

- Google APIs use `@googleapis/androidpublisher` and `@googleapis/playdeveloperreporting` instead of `googleapis`
- Google Play and App Store app lists read every page instead of the first one
- New database columns: `app_groups.custom_icon`, `app_groups.google_console_url` (run `npx drizzle-kit push`)

## 1.0.0

Initial release.

### Features

- **App Groups** — Link Google Play and App Store apps into unified groups with reordering
- **Release Tracking** — Monitor release status across tracks/platforms (live, review, pending, issue, draft)
- **Reviews** — View recent reviews from both stores in one place
- **Google Play Promotion** — Promote releases between tracks, carry over release notes
- **TestFlight Builds** — Show newest TestFlight build with version and build number
- **App Icons** — Display app icons in pickers and group headers
- **Google Play App List** — Browse and select apps via Reporting API
- **Apple Platform Filter** — Filter Apple releases by platform (iOS, macOS, tvOS, visionOS)
- **Encrypted Credentials** — AES-256-GCM encryption for stored API keys
- **Dark Mode** — Full dark/light theme support
- **External Links** — Open apps directly in Google Play Console and App Store Connect
