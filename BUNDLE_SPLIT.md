# DockPilot Bundle Split

This project now has two build targets so FPA Dev stays out of client rollout artifacts.

## Build Commands

- Client rollout bundle:
  - `./build_client_bundle.command`
- Developer-only bundle:
  - `./build_dev_bundle.command`
- Publish client bundle to GitHub Pages:
  - `./publish_client_pages.command`
- Open latest GitHub Actions deploy run:
  - `./open_latest_pages_run.command`

## Output Folders

- Client files: `dist/client/`
- Developer files: `dist/dev/`

## Notes

- Both bundles use the same `supabaseClient.js`, so they connect to the same Supabase project.
- `fpadevDockPilot.html` exists only in `dist/dev/` and is excluded from `dist/client/`.
- Keep backend auth checks on admin functions enabled; bundling separation is not a replacement for server-side authorization.
- GitHub Pages workflow now uploads `dist/client` only.
- `publish_client_pages.command` automatically calls `open_latest_pages_run.command` after push.

## Bundle Manifests

- Client manifest: `scripts/manifests/client.txt`
- Dev manifest: `scripts/manifests/dev.txt`

Edit these manifest files when adding/removing pages or assets for either bundle.
