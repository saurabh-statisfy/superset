# Notice of modification

This is a **modified copy** of Superset, distributed under the Elastic License 2.0
(see [`LICENSE.md`](LICENSE.md)). It is **not** an official Superset build and is not
supported by Superset, Inc.

Upstream: https://github.com/superset-sh/superset
Modified from upstream commit `2a30770c3`.

Modifications are confined to the `offline-ide` branch and were made to produce a
desktop build that runs with no sign-in and no outbound telemetry, for internal use.

## What was changed

- **Offline build flag.** A new build-time `SUPERSET_OFFLINE` flag makes the existing
  development sign-in bypass available to a packaged build. A build made without the
  flag is unaffected.
- **Telemetry.** PostHog is left uninitialised when no key is configured; the offline
  build ships no key. Sentry was already inactive without a DSN.
- **Auto-update disabled** in offline builds, so an unofficial build cannot replace
  itself with an official release.
- **Navigation.** Removed the Tasks, Automations, and Organization entries, all of
  which depend on the hosted API that an offline build cannot reach.
- **Added:** last-hour memory history in the Resources panel; a "Review requested"
  pull-request view; a "Sync main" action; desktop notifications for new pull-request
  comments, polled directly from GitHub.
- **Fixes** to offline startup, error reporting, and the resource monitor's visibility.

## Licensing note

The Elastic License 2.0 prohibits circumventing license-key functionality. The paid
feature gate (`usePaywall`) is **not** modified, disabled, or bypassed by these
changes: with no signed-in session the plan resolves to `free` and every gated
feature remains locked. Removal of the Tasks navigation entry removes an entry point
to a gated feature; it does not unlock it.
