# Development

Run the dev server without env validation or auth:

```bash
SKIP_ENV_VALIDATION=1 bun run dev
```

This skips environment variable validation and the sign-in screen. Desktop chat also falls back to local-only session bootstrap in this mode, so you can test chat/streaming without the cloud API as long as you have local model credentials configured.

# macOS local build (offline)

Produces an unsigned `.app` you can run yourself. `SUPERSET_OFFLINE` is baked
in at **compile** time by `electron.vite.config.ts` (`define:`), not read at
startup — so it has to be set for the whole command, not just the packaging
step. A build made with it set has no sign-in and talks to no cloud
(`src/renderer/env.renderer.ts`).

From `apps/desktop`:

```bash
bun run install:deps   # once, and after any Electron or node-pty bump
SUPERSET_OFFLINE=1 CSC_IDENTITY_AUTO_DISCOVERY=false \
  bun run build -- -c.mac.notarize=false --arm64
```

- `CSC_IDENTITY_AUTO_DISCOVERY=false` stops electron-builder picking up a
  signing certificate from your keychain.
- `-c.mac.notarize=false` overrides `notarize: true` in
  `electron-builder.ts`, which otherwise needs Apple credentials and fails.
- Swap `--arm64` for `--x64` on an Intel Mac.

Output lands in `apps/desktop/release/`:

- `mac-arm64/Superset.app` — the one to run
- `*.dmg` and `*.zip` — installers, not needed for local use

Gatekeeper blocks unsigned apps on first launch. Clear the quarantine
attribute once:

```bash
xattr -dr com.apple.quarantine release/mac-arm64/Superset.app
open release/mac-arm64/Superset.app
```

Leave `SUPERSET_OFFLINE` unset to build the normal cloud-backed app.

# Release

When building for release, make sure `node-pty` is built for the correct architecture with `bun run install:deps`, then run `bun run release`.

# Linux (AppImage) local build

From `apps/desktop`:

```bash
bun run clean:dev
bun run compile:app
bun run package -- --publish never --config electron-builder.ts
```

Expected outputs in `apps/desktop/release/`:

- `*.AppImage`
- `*-linux.yml` (Linux auto-update manifest)

# Linux auto-update verification (local)

From `apps/desktop` after packaging:

```bash
ls -la release/*.AppImage
ls -la release/*-linux.yml
```

If both files exist, packaging produced the Linux artifact + updater metadata that `electron-updater` expects.
